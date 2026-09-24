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
import { ReportExportButtonComponent } from '../../../shared/components/report-export-button/report-export-button.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { AccountService } from '../../../core/auth/account.service';
import { BranchService } from '../../../core/auth/branch.service';
import { LoginService } from '../../login/login.service';
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
    ReportExportButtonComponent,
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
  readonly accountService = inject(AccountService);
  readonly loginService = inject(LoginService);
  readonly isSwitchingBranch = signal(false);

  readonly isManagerOrAdmin = computed(() => {
    const account = this.accountService.account();
    if (!account) return false;
    const authorities = account.authorities;
    return (
      authorities.includes('ROLE_MANAGER') ||
      authorities.includes('ROLE_ADMIN') ||
      authorities.includes('ADMIN') ||
      authorities.includes('FULL_PERMISSION') ||
      account.login === 'admin'
    );
  });
  readonly isCashierSelfService = computed(
    () => this.accountService.account()?.authorities.includes('ROLE_CASHIER') === true && !this.isManagerOrAdmin(),
  );
  readonly isManagementMode = computed(() => {
    const account = this.accountService.account();
    if (!account) return false;
    return !this.isCashierSelfService() && (this.isManagerOrAdmin() || account.authorities.includes(ROLE.CA_LAM_VIEC.VIEW));
  });
  readonly canManageTemplates = computed(() => this.accountService.hasAnyAuthority(ROLE.CA_LAM_VIEC.VIEW));

  // Tab State: 'operations' | 'templates'
  activeTab = signal<'operations' | 'templates'>('operations');

  onTabChange(index: number): void {
    this.activeTab.set(index === 0 ? 'operations' : 'templates');
  }

  readonly currentBranchName = computed(() => {
    const id = this.selectedBranchId();
    if (!id) return this.branchService.currentBranch()?.name ?? '';
    if (this.branchService.branches().length === 0) return this.branchService.currentBranch()?.name ?? '';
    return this.branchService.branches().find(b => b.id === id)?.name ?? '';
  });

  isSystemShiftCode(code: string | null | undefined): boolean {
    const c = (code ?? '').trim().toUpperCase();
    return c === 'CA_A' || c === 'CA_B';
  }

  /** Ca SCHEDULED/CHECKED_IN mà ngày làm đã qua hôm nay => quá hạn, cần Hủy/Đóng. */
  isOverdue(a: ShiftAssignment): boolean {
    if (!a?.workDate || (a.status !== 'SCHEDULED' && a.status !== 'CHECKED_IN')) return false;
    const today = new Date();
    const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
    const [yy, mm, dd] = String(a.workDate).slice(0, 10).split('-').map(Number);
    if (!yy || !mm || !dd) return false;
    return new Date(yy, mm - 1, dd).getTime() < new Date(y, m, d).getTime();
  }

  readonly coverageWarnings = computed(() => {
    const list = this.assignments();
    const branchLabel = this.currentBranchName() || 'chi nhánh đang chọn';
    if (!list || list.length === 0) {
      if (this.shifts().length === 0 && this.selectedBranchId()) {
        return [`Chi nhánh ${branchLabel} chưa có khung ca nào — kiểm tra lại Danh mục Khung ca chuẩn`];
      }
      return [`Ngày làm việc này tại ${branchLabel} chưa xếp ai trực`];
    }
    const shifts = this.shifts();
    const codes = new Set(list.map(a => (a.shiftCode ?? '').trim().toUpperCase()));
    const configured = new Map(
      shifts
        .filter(s => this.isSystemShiftCode(s.shiftCode))
        .map(s => [(s.shiftCode ?? '').trim().toUpperCase(), s]),
    );
    const source = [
      configured.get('CA_A') ?? ({ shiftCode: 'CA_A', shiftName: 'Ca A', startTime: '06:30:00', endTime: '15:00:00' } as Shift),
      configured.get('CA_B') ?? ({ shiftCode: 'CA_B', shiftName: 'Ca B', startTime: '15:00:00', endTime: '23:00:00' } as Shift),
    ];
    const warns: string[] = [];
    for (const s of source) {
      const code = (s.shiftCode ?? '').trim().toUpperCase();
      if (!code || codes.has(code)) continue;
      const hours = s.startTime && s.endTime ? ` (${s.startTime} - ${s.endTime})` : '';
      warns.push(`${s.shiftName || code}${hours} chưa có người trực`);
    }
    return warns;
  });

  onBranchChange(branchId: string | null): void {
    if (this.isCashierSelfService()) return;
    const list = this.branchService.branches();
    const fallback = this.branchService.currentBranch()?.id ?? list[0]?.id ?? null;
    const nextBranchId = branchId || fallback;
    const matched = list.find(b => b.id === nextBranchId);
    if (!matched) return;
    if (matched.id === this.branchService.currentBranch()?.id) {
      this.selectedBranchId.set(matched.id);
      return;
    }

    this.isSwitchingBranch.set(true);
    this.loginService.selectBranch(matched.id).subscribe({
      next: () => {
        this.isSwitchingBranch.set(false);
        this.branchService.setCurrentBranch(matched);
        this.selectedBranchId.set(matched.id);
        this.operationPageIndex = 1;
        this.templatePageIndex = 1;
        this.loadOperationsData();
        if (this.canManageTemplates()) this.loadShiftsData();
      },
      error: err => {
        this.isSwitchingBranch.set(false);
        this.selectedBranchId.set(this.branchService.currentBranch()?.id ?? fallback);
        this.toastService.error('Không thể đổi chi nhánh', err.message || 'Vui lòng thử lại.');
      },
    });
  }

  private syncBranchSelection(): void {
    const list = this.branchService.branches();
    const current = this.branchService.currentBranch();
    if (!this.selectedBranchId()) {
      if (current) this.selectedBranchId.set(current.id);
      else if (list.length > 0) this.selectedBranchId.set(list[0].id);
      return;
    }
    if (list.length > 0 && !list.some(b => b.id === this.selectedBranchId())) {
      this.selectedBranchId.set(current?.id ?? list[0].id);
    }
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
  readonly selectedBranchId = signal<string | null>(null);
  selectedWorkDate: Date = new Date();
  selectedStatus: string | null = null;
  operationPageIndex = DEFAULT_PAGE_INDEX;
  operationPageSize = DEFAULT_PAGE_SIZE;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // Banner ca kẹt qua đêm (CHECKED_IN quá hạn, tự quét khi tải màn hình)
  readonly stuckShifts = signal<ShiftAssignment[]>([]);
  readonly isScanningStuck = signal<boolean>(false);

  private yesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.formatDate(d);
  }

  /** Quét ca CHECKED_IN quá hạn để báo banner (chỉ management mode). */
  scanStuckShifts(): void {
    if (this.isCashierSelfService()) {
      this.stuckShifts.set([]);
      return;
    }
    this.isScanningStuck.set(true);
    const branchId = this.selectedBranchId() || undefined;
    this.shiftService
      .searchAssignments(branchId, undefined, this.yesterdayStr(), undefined, 'CHECKED_IN', 0, 50)
      .subscribe({
        next: page => {
          this.stuckShifts.set(page?.content ?? []);
          this.isScanningStuck.set(false);
        },
        error: () => {
          this.stuckShifts.set([]);
          this.isScanningStuck.set(false);
        },
      });
  }

  /** Nhảy tới ca kẹt của nhân viên: ưu tiên mở modal đóng hộ ca két. */
  jumpToStuckShift(accountId: string): void {
    const branchId = this.selectedBranchId() || undefined;
    this.shiftService
      .searchAssignments(branchId, undefined, this.yesterdayStr(), accountId, 'CHECKED_IN', 0, 20)
      .subscribe({
        next: page => {
          const list = page?.content ?? [];
          if (list.length === 0) {
            this.toastService.info('Không còn ca kẹt', 'Ca kẹt có thể đã được tự đóng, thử mở ca lại.');
            this.loadOperationsData();
            return;
          }
          const cash = list.find(x => x.cashHandler === true);
          if (cash) {
            this.openCloseShiftModal(cash);
            return;
          }
          const first = list[0];
          this.selectedWorkDate = new Date(first.workDate + 'T00:00:00');
          this.selectedStatus = 'CHECKED_IN';
          this.onSearchOperations();
        },
        error: err => this.toastService.error('Lỗi tìm ca kẹt', err.message),
      });
  }

  /** Payload xuất biên bản chốt ca (STORE_SHIFT_REPORT) theo bộ lọc hiện tại. */
  get shiftExportPayload(): Record<string, any> {
    return {
      branchId: this.selectedBranchId() || undefined,
      businessDate: this.selectedWorkDate ? this.formatDate(this.selectedWorkDate) : undefined,
      status: this.selectedStatus || undefined,
    };
  }

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

  // Ngưỡng lệch cho phép: max(10k, 0.5% doanh thu ca) — đồng bộ BE.
  readonly toleranceAmount = computed(() => {
    const total = this.closingSummary()?.totalSales || 0;
    return Math.max(10000, total * 0.005);
  });

  readonly needsDifferenceReason = computed(() => Math.abs(this.calculatedDifference()) > this.toleranceAmount());

  // ════════════════════════════════════════════════════════════════════
  // 2. STATE TAB 2: KHUNG CA CHUẨN (SHIFT TEMPLATES)
  // ════════════════════════════════════════════════════════════════════
  readonly shifts = signal<Shift[]>([]);
  readonly isShiftsLoading = signal<boolean>(false);
  readonly totalShifts = signal<number>(0);
  templatePageIndex = DEFAULT_PAGE_INDEX;
  templatePageSize = DEFAULT_PAGE_SIZE;
  readonly templateSearchQuery = signal<string>('');

  // Modal Thêm / Sửa khung ca
  readonly isShiftModalVisible = signal<boolean>(false);
  readonly shiftModalMode = signal<'create' | 'edit'>('create');
  readonly isSavingShift = signal<boolean>(false);
  readonly editingShiftId = signal<string | null>(null);
  shiftForm!: FormGroup;

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Cửa hàng', url: '/admin/store/shifts/list' },
      { label: 'Ca làm việc', url: '/admin/store/shifts/list' },
    ]);

    this.initForms();
    this.accountService.identity().subscribe(account => {
      if (!account) return;
      if (this.isCashierSelfService()) {
        this.loadOperationsData();
        return;
      }

      this.branchService.loadMine().subscribe(() => {
        const current = this.branchService.currentBranch();
        if (current) {
          this.selectedBranchId.set(current.id);
        }
        this.syncBranchSelection();
        this.loadOperationsData();
        if (this.canManageTemplates()) this.loadShiftsData();
      });
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
    this.scanStuckShifts();
    if (this.isCashierSelfService()) {
      this.shiftService.getMyActiveShift().subscribe({
        next: assignment => {
          this.assignments.set(assignment ? [assignment] : []);
          this.totalOperations.set(assignment ? 1 : 0);
          this.todayRevenue.set(0);
          this.todayCash.set(0);
          this.todayTransfer.set(0);
          this.todayDifference.set(0);
          this.isOperationsLoading.set(false);
        },
        error: err => {
          this.assignments.set([]);
          this.totalOperations.set(0);
          this.isOperationsLoading.set(false);
          this.toastService.error('Lỗi tải ca làm việc', err.message);
        },
      });
      return;
    }

    const dateStr = this.selectedWorkDate ? this.formatDate(this.selectedWorkDate) : undefined;
    const branchId = this.selectedBranchId() || undefined;
    const status = this.selectedStatus || undefined;

    this.shiftService
      .searchAssignments(branchId, dateStr, dateStr, undefined, status, this.operationPageIndex - 1, this.operationPageSize)
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
    if (a.cashHandler !== true) {
      this.toastService.warning('Không thể mở ca', 'Ca này không được phân công cầm két.');
      return;
    }
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
        if (err?.errorCode === 'STORE_400_ACTIVE_SHIFT_EXISTS' && a.accountId) {
          this.toastService.infoAction('Đi tới ca kẹt', 'Bấm để tìm ca chưa đóng của nhân viên này', () =>
            this.jumpToStuckShift(a.accountId),
          );
        }
      },
    });
  }

  // ── Đóng ca & Chốt két ──────────────────────────────────────────────
  openCloseShiftModal(a: ShiftAssignment): void {
    if (a.cashHandler !== true) {
      this.toastService.warning('Không thể chốt ca', 'Ca này không vận hành két tiền.');
      return;
    }
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
    if (this.needsDifferenceReason() && (!formVal.differenceReason?.trim() || formVal.differenceReason.trim().length < 10)) {
      this.closeShiftForm.get('differenceReason')?.setErrors({ minlength: true });
      this.closeShiftForm.get('differenceReason')?.markAsTouched();
      this.toastService.warning('Cần giải trình', 'Két tiền bị chênh lệch! Vui lòng nhập lý do giải trình (tối thiểu 10 ký tự).');
      return;
    }

    this.isClosingShift.set(true);
    const actualCash = Number(formVal.actualCash);
    const payload: CloseShiftPayload = {
      actualCash: Number.isFinite(actualCash) ? actualCash : 0,
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

  // ── Điểm danh vào/ra cho nhân viên không cầm két (chấm công) ──────
  readonly isCheckingAttendance = signal<boolean>(false);

  onCheckInAttendance(a: ShiftAssignment): void {
    this.isCheckingAttendance.set(true);
    this.shiftService.checkInAttendance(a.id).subscribe({
      next: () => {
        this.isCheckingAttendance.set(false);
        this.toastService.success('Điểm danh thành công', `${a.employeeName} đã vào ca ${a.shiftName}`);
        this.loadOperationsData();
      },
      error: err => {
        this.isCheckingAttendance.set(false);
        this.toastService.error('Không thể điểm danh vào', err.message);
      },
    });
  }

  onCheckOutAttendance(a: ShiftAssignment): void {
    this.isCheckingAttendance.set(true);
    this.shiftService.checkOutAttendance(a.id).subscribe({
      next: () => {
        this.isCheckingAttendance.set(false);
        this.toastService.success('Điểm danh thành công', `${a.employeeName} đã ra ca ${a.shiftName}`);
        this.loadOperationsData();
      },
      error: err => {
        this.isCheckingAttendance.set(false);
        this.toastService.error('Không thể điểm danh ra', err.message);
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

  onRejectShiftReport(): void {
    const report = this.selectedReport();
    if (!report) return;

    const reason = window.prompt('Nhập lý do từ chối biên bản (tối thiểu 10 ký tự) để thu ngân sửa và nộp lại:', '');
    if (reason === null) return;
    if (!reason.trim() || reason.trim().length < 10) {
      this.toastService.warning('Lý do chưa đạt', 'Vui lòng nhập lý do từ chối tối thiểu 10 ký tự.');
      return;
    }

    this.isApprovingReport.set(true);
    this.shiftService.rejectShiftReport(report.id, reason.trim()).subscribe({
      next: updated => {
        this.isApprovingReport.set(false);
        this.toastService.success('Đã từ chối', 'Biên bản đã trả về, ca được mở lại để thu ngân chốt lại');
        this.selectedReport.set(updated);
        this.loadOperationsData();
      },
      error: err => {
        this.isApprovingReport.set(false);
        this.toastService.error('Không thể từ chối', err.message);
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // 4. LOGIC TAB 2: KHUNG CA CHUẨN (SHIFT TEMPLATES)
  // ════════════════════════════════════════════════════════════════════

  loadShiftsData(): void {
    if (!this.canManageTemplates()) return;
    this.isShiftsLoading.set(true);
    const branchId = this.selectedBranchId() || undefined;
    const query = this.templateSearchQuery().trim() || undefined;

    this.shiftService.searchShifts(branchId, undefined, this.templatePageIndex - 1, this.templatePageSize, query).subscribe({
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
    const defaultBranch = this.selectedBranchId() || this.branchService.currentBranch()?.id || this.branchService.branches()[0]?.id || '';
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

  onSearchTemplates(): void {
    this.templatePageIndex = 1;
    this.loadShiftsData();
  }

  onResetTemplates(): void {
    this.templateSearchQuery.set('');
    this.templatePageIndex = 1;
    this.loadShiftsData();
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
