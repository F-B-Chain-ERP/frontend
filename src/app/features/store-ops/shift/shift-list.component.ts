import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTabsModule, NzTabsComponent, NzTabComponent } from 'ng-zorro-antd/tabs';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { BranchService } from '../../../core/auth/branch.service';
import { StoreShiftService } from './shift.service';
import {
  Shift,
  ShiftAssignment,
  ShiftReport,
  ClosingSummary,
  CloseShiftPayload,
  OpenShiftPayload,
  ShiftStatus,
  ShiftAssignmentStatus,
  SHIFT_ASSIGNMENT_STATUS_OPTIONS,
  getShiftAssignmentStatusMeta,
  getShiftReportStatusMeta,
} from './shift.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzInputNumberModule,
    NzGridModule,
    NzDividerModule,
    NzModalModule,
    NzDrawerModule,
    NzTabsModule,
    NzTabsComponent,
    NzTabComponent,
    NzTooltipModule,
    NzIconModule,
    NzTagModule,
    NzSpinModule,
    NzAlertModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './shift-list.component.html',
  styleUrls: ['./shift-list.component.scss'],
})
export class ShiftListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly getShiftAssignmentStatusMeta = getShiftAssignmentStatusMeta;
  readonly getShiftReportStatusMeta = getShiftReportStatusMeta;
  readonly assignmentStatusOptions = SHIFT_ASSIGNMENT_STATUS_OPTIONS;
  readonly currencyFormatter = (value: number): string => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0');
  readonly currencyParser = (value: string): number => Number(value.replace(/\$\s?|(,*)/g, '')) || 0;

  readonly branchService = inject(BranchService);
  readonly shiftService = inject(StoreShiftService);

  // Tab State: 'operations' | 'templates'
  activeTab = signal<'operations' | 'templates'>('operations');

  onTabChange(index: number): void {
    this.activeTab.set(index === 0 ? 'operations' : 'templates');
  }

  // ════════════════════════════════════════════════════════════════════
  // 1. STATE TAB 1: VẬN HÀNH CA & ĐỐI SOÁT KÉT
  // ════════════════════════════════════════════════════════════════════
  readonly assignments = signal<ShiftAssignment[]>([]);
  readonly isOperationsLoading = signal<boolean>(false);
  readonly totalOperations = signal<number>(0);

  // KPI Signals
  readonly todayRevenue = signal<number>(0);
  readonly todayCash = signal<number>(0);
  readonly todayTransfer = signal<number>(0);
  readonly todayDifference = signal<number>(0);

  // Filter params cho vận hành ca
  selectedBranchId: string | null = null;
  selectedWorkDate: Date = new Date();
  selectedStatus: string | null = null;
  operationPageIndex = DEFAULT_PAGE_INDEX;
  operationPageSize = DEFAULT_PAGE_SIZE;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // Drawer Xem biên bản đối soát
  readonly isDrawerVisible = signal<boolean>(false);
  readonly selectedAssignment = signal<ShiftAssignment | null>(null);
  readonly selectedReport = signal<ShiftReport | null>(null);
  readonly isReportLoading = signal<boolean>(false);
  readonly isApprovingReport = signal<boolean>(false);

  // Modal Mở ca
  readonly isOpenModalVisible = signal<boolean>(false);
  readonly isOpeningShift = signal<boolean>(false);
  readonly targetAssignmentForOpen = signal<ShiftAssignment | null>(null);
  openShiftForm!: FormGroup;

  // Modal Đóng ca & Chốt két
  readonly isCloseModalVisible = signal<boolean>(false);
  readonly isClosingShift = signal<boolean>(false);
  readonly targetAssignmentForClose = signal<ShiftAssignment | null>(null);
  readonly closingSummary = signal<ClosingSummary | null>(null);
  readonly isSummaryLoading = signal<boolean>(false);
  closeShiftForm!: FormGroup;
  readonly closingCashActualSignal = signal<number>(0);
  readonly cashPayoutSignal = signal<number>(0);

  // Computed: Chênh lệch tạm tính trong modal đóng ca
  readonly calculatedDifference = computed(() => {
    const summary = this.closingSummary();
    if (!summary) return 0;
    const actual = this.closingCashActualSignal();
    const payout = this.cashPayoutSignal();
    const expected = summary.initialCash + summary.cashSales - payout;
    return actual - expected;
  });

  // ════════════════════════════════════════════════════════════════════
  // 2. STATE TAB 2: KHUNG CA CHUẨN (SHIFT TEMPLATES)
  // ════════════════════════════════════════════════════════════════════
  readonly shifts = signal<Shift[]>([]);
  readonly isShiftsLoading = signal<boolean>(false);
  readonly totalShifts = signal<number>(0);
  templatePageIndex = DEFAULT_PAGE_INDEX;
  templatePageSize = DEFAULT_PAGE_SIZE;

  // Modal Thêm / Sửa khung ca
  readonly isShiftModalVisible = signal<boolean>(false);
  readonly shiftModalMode = signal<'create' | 'edit'>('create');
  readonly isSavingShift = signal<boolean>(false);
  readonly editingShiftId = signal<string | null>(null);
  shiftForm!: FormGroup;

  ngOnInit(): void {
    this.initForms();
    this.branchService.loadMine().subscribe(() => {
      const current = this.branchService.currentBranch();
      if (current) {
        this.selectedBranchId = current.id;
      }
      this.loadOperationsData();
      this.loadShiftsData();
    });
  }

  private initForms(): void {
    this.openShiftForm = this.fb.group({
      initialCash: [1000000, [Validators.required, Validators.min(0)]],
      note: [''],
    });

    this.closeShiftForm = this.fb.group({
      actualCash: [0, [Validators.required, Validators.min(0)]],
      cashPayout: [0, [Validators.min(0)]],
      differenceReason: [''],
      note: [''],
    });

    this.closeShiftForm.get('actualCash')?.valueChanges.subscribe(val => {
      this.closingCashActualSignal.set(Number(val) || 0);
    });
    this.closeShiftForm.get('cashPayout')?.valueChanges.subscribe(val => {
      this.cashPayoutSignal.set(Number(val) || 0);
    });

    this.shiftForm = this.fb.group({
      branchId: ['', [Validators.required]],
      shiftCode: ['', [Validators.required, Validators.maxLength(50)]],
      shiftName: ['', [Validators.required, Validators.maxLength(100)]],
      startTime: ['06:30:00', [Validators.required]],
      endTime: ['14:30:00', [Validators.required]],
      status: [ShiftStatus.ACTIVE, [Validators.required]],
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // 3. LOGIC TAB 1: VẬN HÀNH CA & ĐỐI SOÁT KÉT
  // ════════════════════════════════════════════════════════════════════

  loadOperationsData(): void {
    this.isOperationsLoading.set(true);
    const dateStr = this.selectedWorkDate ? this.formatDate(this.selectedWorkDate) : undefined;
    const branchId = this.selectedBranchId || undefined;
    const status = this.selectedStatus || undefined;

    this.shiftService
      .searchAssignments(
        branchId,
        dateStr,
        dateStr,
        undefined,
        status,
        this.operationPageIndex - 1,
        this.operationPageSize,
      )
      .subscribe({
        next: page => {
          const list = page?.content ?? [];
          this.assignments.set(list);
          this.totalOperations.set(page?.totalElements ?? list.length);
          this.isOperationsLoading.set(false);
          this.calculateKpis(list);
        },
        error: err => {
          this.isOperationsLoading.set(false);
          this.toastService.error('Lỗi tải dữ liệu', err.message);
        },
      });
  }

  private calculateKpis(list: ShiftAssignment[]): void {
    let rev = 0;
    let cash = 0;
    let transfer = 0;
    let diff = 0;

    for (const a of list) {
      if (a.finalCash) cash += a.finalCash;
      if (a.cashDifference) diff += a.cashDifference;
    }

    // Doanh thu tạm tính từ tiền mặt nộp két
    rev = cash;
    transfer = Math.max(0, rev * 0.55); // Ước tính tương quan POS nếu chưa chốt sổ
    this.todayRevenue.set(rev + transfer);
    this.todayCash.set(cash);
    this.todayTransfer.set(transfer);
    this.todayDifference.set(diff);
  }

  onSearchOperations(): void {
    this.operationPageIndex = 1;
    this.loadOperationsData();
  }

  onResetOperations(): void {
    this.selectedStatus = null;
    this.selectedWorkDate = new Date();
    this.operationPageIndex = 1;
    this.loadOperationsData();
  }

  onOperationPageIndexChange(idx: number): void {
    this.operationPageIndex = idx;
    this.loadOperationsData();
  }

  onOperationPageSizeChange(size: number): void {
    this.operationPageSize = size;
    this.operationPageIndex = 1;
    this.loadOperationsData();
  }

  // ── Mở ca ──────────────────────────────────────────────────────────
  openOpenShiftModal(a: ShiftAssignment): void {
    this.targetAssignmentForOpen.set(a);
    this.openShiftForm.reset({
      initialCash: a.initialCash || 1000000,
      note: '',
    });
    this.isOpenModalVisible.set(true);
  }

  closeOpenShiftModal(): void {
    this.isOpenModalVisible.set(false);
    this.targetAssignmentForOpen.set(null);
  }

  submitOpenShift(): void {
    if (this.openShiftForm.invalid) {
      this.openShiftForm.markAllAsTouched();
      return;
    }
    const a = this.targetAssignmentForOpen();
    if (!a) return;

    this.isOpeningShift.set(true);
    const payload = this.openShiftForm.value;

    this.shiftService.openShift(a.id, payload).subscribe({
      next: updated => {
        this.isOpeningShift.set(false);
        this.isOpenModalVisible.set(false);
        this.toastService.success('Mở ca thành công', `Đã mở ca làm việc cho ${updated.employeeName}`);
        this.loadOperationsData();
      },
      error: (err: any) => {
        this.isOpeningShift.set(false);
        if (err?.fieldErrors) {
          Object.entries(err.fieldErrors).forEach(([field, msg]) => {
            const control = this.openShiftForm.get(field);
            if (control) {
              control.setErrors({ serverError: msg });
              control.markAsTouched();
            }
          });
        }
        this.toastService.error('Không thể mở ca', err.message || 'Đã xảy ra lỗi khi mở ca.');
      },
    });
  }

  // ── Đóng ca & Chốt két ──────────────────────────────────────────────
  openCloseShiftModal(a: ShiftAssignment): void {
    this.targetAssignmentForClose.set(a);
    this.isCloseModalVisible.set(true);
    this.isSummaryLoading.set(true);

    this.shiftService.getClosingSummary(a.id).subscribe({
      next: summary => {
        this.closingSummary.set(summary);
        this.isSummaryLoading.set(false);
        this.closingCashActualSignal.set(summary.expectedCash || 0);
        this.cashPayoutSignal.set(summary.cashPayout || 0);
        this.closeShiftForm.reset({
          actualCash: summary.expectedCash,
          cashPayout: summary.cashPayout || 0,
          differenceReason: '',
          note: '',
        });
      },
      error: err => {
        this.isSummaryLoading.set(false);
        this.toastService.error('Lỗi tải tóm tắt ca', err.message);
        this.isCloseModalVisible.set(false);
      },
    });
  }

  closeCloseShiftModal(): void {
    this.isCloseModalVisible.set(false);
    this.targetAssignmentForClose.set(null);
    this.closingSummary.set(null);
  }

  submitCloseShift(): void {
    if (this.closeShiftForm.invalid) {
      this.closeShiftForm.markAllAsTouched();
      this.toastService.error('Vui lòng kiểm tra lại các thông tin bắt buộc.');
      return;
    }
    const a = this.targetAssignmentForClose();
    if (!a) return;

    const formVal = this.closeShiftForm.value;
    const diff = this.calculatedDifference();
    if (diff !== 0 && (!formVal.differenceReason?.trim() || formVal.differenceReason.trim().length < 10)) {
      this.closeShiftForm.get('differenceReason')?.setErrors({ minlength: true });
      this.closeShiftForm.get('differenceReason')?.markAsTouched();
      this.toastService.warning('Cần giải trình', 'Két tiền bị chênh lệch! Vui lòng nhập lý do giải trình (tối thiểu 10 ký tự).');
      return;
    }

    this.isClosingShift.set(true);
    const payload: CloseShiftPayload = {
      actualCash: Number(formVal.actualCash) != null && !isNaN(Number(formVal.actualCash)) ? Number(formVal.actualCash) : 0,
      cashPayout: Number(formVal.cashPayout) || 0,
      differenceReason: formVal.differenceReason?.trim() || undefined,
      note: formVal.note?.trim() || undefined,
    };

    this.shiftService.closeShift(a.id, payload).subscribe({
      next: report => {
        this.isClosingShift.set(false);
        this.isCloseModalVisible.set(false);
        this.toastService.success('Chốt ca thành công', `Đã xuất biên bản chốt ca với chênh lệch ${report.difference.toLocaleString()} ₫`);
        this.loadOperationsData();
      },
      error: (err: any) => {
        this.isClosingShift.set(false);
        if (err?.fieldErrors) {
          Object.entries(err.fieldErrors).forEach(([field, msg]) => {
            const control = this.closeShiftForm.get(field);
            if (control) {
              control.setErrors({ serverError: msg });
              control.markAsTouched();
            }
          });
        }
        this.toastService.error('Không thể chốt ca', err.message || 'Đã xảy ra lỗi khi chốt ca.');
      },
    });
  }

  // ── Drawer Xem biên bản đối soát & Ký duyệt ───────────────────────
  onViewReconciliation(a: ShiftAssignment): void {
    this.selectedAssignment.set(a);
    this.isDrawerVisible.set(true);
    this.isReportLoading.set(true);
    this.selectedReport.set(null);

    this.shiftService.getShiftReportByAssignment(a.id).subscribe({
      next: report => {
        this.selectedReport.set(report);
        this.isReportLoading.set(false);
      },
      error: () => {
        this.isReportLoading.set(false);
      },
    });
  }

  onCloseDrawer(): void {
    this.isDrawerVisible.set(false);
    this.selectedAssignment.set(null);
    this.selectedReport.set(null);
  }

  onApproveShiftReport(): void {
    const report = this.selectedReport();
    if (!report) return;

    this.isApprovingReport.set(true);
    this.shiftService.confirmShiftReport(report.id, { note: 'Cửa hàng trưởng ký duyệt nộp két an toàn' }).subscribe({
      next: updated => {
        this.isApprovingReport.set(false);
        this.toastService.success('Duyệt thành công', 'Đã ký duyệt chốt ca và bàn giao quỹ an toàn');
        this.selectedReport.set(updated);
        this.loadOperationsData();
      },
      error: err => {
        this.isApprovingReport.set(false);
        this.toastService.error('Không thể duyệt ca', err.message);
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // 4. LOGIC TAB 2: KHUNG CA CHUẨN (SHIFT TEMPLATES)
  // ════════════════════════════════════════════════════════════════════

  loadShiftsData(): void {
    this.isShiftsLoading.set(true);
    const branchId = this.selectedBranchId || undefined;

    this.shiftService.searchShifts(branchId, undefined, this.templatePageIndex - 1, this.templatePageSize).subscribe({
      next: page => {
        this.shifts.set(page?.content ?? []);
        this.totalShifts.set(page?.totalElements ?? 0);
        this.isShiftsLoading.set(false);
      },
      error: err => {
        this.isShiftsLoading.set(false);
        this.toastService.error('Lỗi tải danh mục ca', err.message);
      },
    });
  }

  openCreateShiftModal(): void {
    this.shiftModalMode.set('create');
    this.editingShiftId.set(null);
    const defaultBranch = this.selectedBranchId || this.branchService.branches()[0]?.id || '';
    this.shiftForm.reset({
      branchId: defaultBranch,
      shiftCode: '',
      shiftName: '',
      startTime: '06:30:00',
      endTime: '14:30:00',
      status: ShiftStatus.ACTIVE,
    });
    this.isShiftModalVisible.set(true);
  }

  openEditShiftModal(s: Shift): void {
    this.shiftModalMode.set('edit');
    this.editingShiftId.set(s.id);
    this.shiftForm.reset({
      branchId: s.branchId,
      shiftCode: s.shiftCode,
      shiftName: s.shiftName,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
    });
    this.isShiftModalVisible.set(true);
  }

  closeShiftModal(): void {
    this.isShiftModalVisible.set(false);
    this.editingShiftId.set(null);
  }

  submitShiftForm(): void {
    if (this.shiftForm.invalid) {
      this.shiftForm.markAllAsTouched();
      return;
    }
    this.isSavingShift.set(true);
    const val = this.shiftForm.value;

    if (this.shiftModalMode() === 'create') {
      this.shiftService.createShift(val).subscribe({
        next: created => {
          this.isSavingShift.set(false);
          this.isShiftModalVisible.set(false);
          this.toastService.success('Tạo thành công', `Đã tạo khung ca ${created.shiftName}`);
          this.loadShiftsData();
        },
        error: err => {
          this.isSavingShift.set(false);
          this.toastService.error('Lỗi tạo khung ca', err.message);
        },
      });
    } else {
      const id = this.editingShiftId();
      if (!id) return;

      this.shiftService.updateShift(id, val).subscribe({
        next: updated => {
          this.isSavingShift.set(false);
          this.isShiftModalVisible.set(false);
          this.toastService.success('Cập nhật thành công', `Đã cập nhật khung ca ${updated.shiftName}`);
          this.loadShiftsData();
        },
        error: err => {
          this.isSavingShift.set(false);
          this.toastService.error('Lỗi cập nhật', err.message);
        },
      });
    }
  }

  deleteShiftTemplate(s: Shift): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa khung ca',
      nzContent: `Bạn có chắc chắn muốn xóa ca "${s.shiftName}" (${s.shiftCode}) không?`,
      nzOkText: 'Xóa',
      nzOkDanger: true,
      nzOnOk: () => {
        this.shiftService.deleteShift(s.id).subscribe({
          next: () => {
            this.toastService.success('Xóa thành công', `Đã xóa khung ca ${s.shiftName}`);
            this.loadShiftsData();
          },
          error: err => this.toastService.error('Không thể xóa', err.message),
        });
      },
    });
  }

  onTemplatePageIndexChange(idx: number): void {
    this.templatePageIndex = idx;
    this.loadShiftsData();
  }

  onTemplatePageSizeChange(size: number): void {
    this.templatePageSize = size;
    this.templatePageIndex = 1;
    this.loadShiftsData();
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
