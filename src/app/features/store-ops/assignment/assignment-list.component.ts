import {Component, DestroyRef, OnInit, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EMPTY, Subscription, expand, reduce} from 'rxjs';
import {CommonModule} from '@angular/common';
import {FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';

import {NzTableModule} from 'ng-zorro-antd/table';
import {NzCardModule} from 'ng-zorro-antd/card';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzDatePickerModule} from 'ng-zorro-antd/date-picker';
import {NzGridModule} from 'ng-zorro-antd/grid';
import {NzDividerModule} from 'ng-zorro-antd/divider';
import {NzModalModule} from 'ng-zorro-antd/modal';
import {NzTooltipModule} from 'ng-zorro-antd/tooltip';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzTagModule} from 'ng-zorro-antd/tag';
import {NzAlertModule} from 'ng-zorro-antd/alert';

import {BaseComponent} from '../../../shared/base-component/base.component';
import {AppBreadcrumbsComponent} from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import {AppButtonComponent} from '../../../shared/app-button/app-button.component';
import {AppPaginationComponent} from '../../../shared/app-pagination/app-pagination.component';
import {AppModalComponent} from '../../../shared/app-modal/app-modal.component';
import {HasSomeAuthorityDirective} from '../../../core/auth/has-some-authority.directive';
import {ROLE} from '../../../core/config/functions.constants';
import {BranchService} from '../../../core/auth/branch.service';
import {UserService} from '../../system/users/user.service';
import {User} from '../../system/users/user.model';
import {StoreShiftService, ShiftServiceError} from '../shift/shift.service';
import {
  Shift,
  ShiftAssignment,
  SHIFT_ASSIGNMENT_STATUS_OPTIONS,
  getShiftAssignmentStatusMeta,
  BulkAssignItemPayload,
  BulkAssignShiftPayload,
} from '../shift/shift.model';
import {DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS} from '../../../shared/constants/constant';

@Component({
  selector: 'app-shift-assignment-list',
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
    NzGridModule,
    NzDividerModule,
    NzModalModule,
    NzTooltipModule,
    NzIconModule,
    NzTagModule,
    NzAlertModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './assignment-list.component.html',
  styleUrls: ['./assignment-list.component.scss'],
})
export class ShiftAssignmentListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly getShiftAssignmentStatusMeta = getShiftAssignmentStatusMeta;
  readonly statusOptions = SHIFT_ASSIGNMENT_STATUS_OPTIONS;

  readonly branchService = inject(BranchService);
  private readonly userService = inject(UserService);
  private readonly shiftService = inject(StoreShiftService);

  readonly assignments = signal<ShiftAssignment[]>([]);
  readonly loading = signal<boolean>(false);
  readonly total = signal<number>(0);

  readonly currentBranchName = computed(() => {
    if (!this.selectedBranchId()) return this.branchService.currentBranch()?.name ?? '';
    if (this.branchService.branches().length === 0) return this.branchService.currentBranch()?.name ?? '';
    return this.branchService.branches().find(b => b.id === this.selectedBranchId())?.name ?? '';
  });

  readonly branchUsers = computed(() => {
    const all = this.availableUsers();
    if (!this.selectedBranchId()) return all;
    const filtered = all.filter(u => !u.primaryBranchId || u.primaryBranchId === this.selectedBranchId());
    return filtered.length > 0 ? filtered : all;
  });

  readonly coverageWarning = computed(() => {
    if (this.loading()) return null;
    const branchLabel = this.currentBranchName() || 'chi nhánh đang chọn';
    if (this.assignments().length > 0) {
      const codes = new Set(this.assignments().map(a => (a.shiftCode ?? '').trim().toUpperCase()));
      const missing: string[] = [];
      const configured = new Map(
        this.availableShifts()
          .filter(s => ['CA_A', 'CA_B'].includes((s.shiftCode ?? '').trim().toUpperCase()))
          .map(s => [(s.shiftCode ?? '').trim().toUpperCase(), s]),
      );
      const source = [
        configured.get('CA_A') ?? ({shiftCode: 'CA_A', shiftName: 'Ca A', startTime: '06:30:00', endTime: '15:00:00'} as Shift),
        configured.get('CA_B') ?? ({shiftCode: 'CA_B', shiftName: 'Ca B', startTime: '15:00:00', endTime: '23:00:00'} as Shift),
      ];
      for (const s of source) {
        const code = (s.shiftCode ?? '').trim().toUpperCase();
        if (!code || codes.has(code)) continue;
        const hours = s.startTime && s.endTime ? ` (${s.startTime} - ${s.endTime})` : '';
        missing.push(`${s.shiftName || code}${hours}`);
      }
      if (missing.length === 0) return null;
      return `Ca trống tại ${branchLabel}: ${missing.join(' • ')} chưa có người trực`;
    }
    if (this.selectedBranchId() && (this.selectedStartDate || this.selectedEndDate)) {
      if (this.availableShifts().length === 0) {
        return `Chi nhánh ${branchLabel} chưa có khung ca nào — kiểm tra lại Danh mục Khung ca chuẩn`;
      }
      return `Chi nhánh ${branchLabel} chưa xếp ai trong khoảng ngày đã chọn`;
    }
    return null;
  });

  // Available options
  readonly availableShifts = signal<Shift[]>([]);
  readonly availableUsers = signal<User[]>([]);

  // Filter params
  readonly selectedBranchId = signal<string | null>(null);
  selectedAccountId: string | null = null;
  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;
  selectedStatus: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // Single Assign Modal
  readonly isAssignModalVisible = signal<boolean>(false);
  readonly isSavingAssign = signal<boolean>(false);
  readonly assignedAccountIds = signal<Set<string>>(new Set());
  readonly isLoadingAssigned = signal(false);
  readonly assignedLookupFailed = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private assignedLookup?: Subscription;
  assignForm!: FormGroup;

  // Bulk Assign Modal
  readonly isBulkModalVisible = signal<boolean>(false);
  readonly isSavingBulk = signal<boolean>(false);
  bulkForm!: FormGroup;

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Cửa hàng', url: '/admin/store/shifts/list' },
      { label: 'Phân ca', url: '/admin/store/assignments/list' },
    ]);

    this.initForms();
    this.loadUsers();
    this.branchService.loadMine().subscribe(() => {
      const current = this.branchService.currentBranch();
      if (current) {
        this.selectedBranchId.set(current.id);
        this.loadShiftsForBranch(current.id);
      }
      this.syncBranchSelection();
      this.loadData();
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

  private initForms(): void {
    this.assignForm = this.fb.group({
      branchId: ['', [Validators.required]],
      shiftId: ['', [Validators.required]],
      accountId: ['', [Validators.required]],
      workDate: [this.formatDate(new Date()), [Validators.required]],
      note: [''],
    });

    this.bulkForm = this.fb.group({
      branchId: ['', [Validators.required]],
      shiftId: ['', [Validators.required]],
      accountIds: [[], [Validators.required]],
      workDates: [[this.formatDate(new Date())], [Validators.required]],
      note: [''],
    });
  }

  loadUsers(): void {
    this.userService.getUsers({pageIndex: 1, pageSize: 100}).subscribe({
      next: res => this.availableUsers.set(res.items ?? []),
      error: () => {
      },
    });
  }

  loadShiftsForBranch(branchId: string): void {
    this.shiftService.getShiftsByBranch(branchId, 'ACTIVE').subscribe({
      next: list => this.availableShifts.set(list),
      error: () => {
      },
    });
  }

  loadData(): void {
    if (this.selectedStartDate && this.selectedEndDate && this.selectedStartDate > this.selectedEndDate) {
      this.toastService.error('Khoảng ngày không hợp lệ', 'Từ ngày phải <= Đến ngày');
      return;
    }
    this.loading.set(true);
    const start = this.selectedStartDate ? this.formatDate(this.selectedStartDate) : undefined;
    const end = this.selectedEndDate ? this.formatDate(this.selectedEndDate) : undefined;
    const branchId = this.selectedBranchId() || undefined;
    const accountId = this.selectedAccountId || undefined;
    const status = this.selectedStatus || undefined;

    this.shiftService
      .searchAssignments(branchId, start, end, accountId, status, this.pageIndex - 1, this.pageSize)
      .subscribe({
        next: page => {
          this.assignments.set(page?.content ?? []);
          this.total.set(page?.totalElements ?? 0);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi tải danh sách phân ca', err.message);
        },
      });
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onReset(): void {
    this.selectedAccountId = null;
    this.selectedStartDate = null;
    this.selectedEndDate = null;
    this.selectedStatus = null;
    this.pageIndex = 1;
    const current = this.branchService.currentBranch();
    if (current) this.selectedBranchId.set(current.id);
    this.loadData();
  }

  onBranchChange(branchId: string | null): void {
    const list = this.branchService.branches();
    const fallback = this.branchService.currentBranch()?.id ?? list[0]?.id ?? null;
    this.selectedBranchId.set(branchId || fallback);
    const matched = list.find(b => b.id === this.selectedBranchId());
    if (matched) {
      if (matched.id !== this.branchService.currentBranch()?.id) this.branchService.setCurrentBranch(matched);
      this.loadShiftsForBranch(matched.id);
    }
    this.onSearch();
  }

  onPageIndexChange(idx: number): void {
    this.pageIndex = idx;
    this.loadData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
    this.loadData();
  }

  // ── Phân ca đơn lẻ ────────────────────────────────────────────────
  loadAssignedForDate(): void {
    this.assignedLookup?.unsubscribe();
    this.assignedAccountIds.set(new Set());
    this.assignedLookupFailed.set(false);
    const {branchId, workDate} = this.assignForm.value;
    this.assignForm.get('accountId')?.reset('');
    if (!branchId || !/^\d{4}-\d{2}-\d{2}$/.test(workDate ?? '')) {
      this.isLoadingAssigned.set(false);
      return;
    }

    this.isLoadingAssigned.set(true);
    this.assignedLookup = this.shiftService
      .searchAssignments(branchId, workDate, workDate, undefined, undefined, 0, 100)
      .pipe(
        expand(page => page.pageNumber + 1 < page.totalPages
          ? this.shiftService.searchAssignments(branchId, workDate, workDate, undefined, undefined, page.pageNumber + 1, 100)
          : EMPTY),
        reduce((ids, page) => {
          for (const assignment of page.content ?? []) {
            if (assignment.branchId === branchId && assignment.workDate === workDate
              && !['CANCELLED', 'ABSENT'].includes(assignment.status.toUpperCase())) {
              ids.add(assignment.accountId);
            }
          }
          return ids;
        }, new Set<string>()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ids => {
          this.assignedAccountIds.set(ids);
          this.isLoadingAssigned.set(false);
        },
        error: () => {
          this.isLoadingAssigned.set(false);
          this.assignedLookupFailed.set(true);
          this.toastService.warning('Chưa kiểm tra được lịch', 'Vui lòng thử tải lại lịch phân ca của nhân viên.');
        },
      });
  }

  openAssignModal(): void {
    const branchId = this.selectedBranchId() || this.branchService.currentBranch()?.id || this.branchService.branches()[0]?.id || '';
    this.selectedBranchId.set(branchId);
    this.loadShiftsForBranch(branchId);
    this.assignForm.reset({
      branchId,
      shiftId: this.availableShifts()[0]?.id || '',
      accountId: '',
      workDate: this.formatDate(new Date()),
      note: '',
    });
    this.isAssignModalVisible.set(true);
    this.loadAssignedForDate();
  }

  closeAssignModal(): void {
    this.assignedLookup?.unsubscribe();
    this.isLoadingAssigned.set(false);
    this.isAssignModalVisible.set(false);
  }

  submitAssignForm(): void {
    if (this.isLoadingAssigned() || this.assignedLookupFailed() || this.isSavingAssign()) return;
    if (this.assignedAccountIds().has(this.assignForm.value.accountId)) {
      this.assignForm.get('accountId')?.reset('');
      this.toastService.warning('Nhân viên đã có ca', 'Vui lòng chọn nhân viên chưa được phân ca trong ngày.');
      return;
    }
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }
    this.isSavingAssign.set(true);
    const val = this.assignForm.value;

    this.shiftService.assignShift(val).subscribe({
      next: created => {
        this.isSavingAssign.set(false);
        this.isAssignModalVisible.set(false);
        this.toastService.success('Phân ca thành công', `Đã phân ca ${created.shiftName} cho ${created.employeeName}`);
        this.loadData();
      },
      error: (err: ShiftServiceError) => {
        this.isSavingAssign.set(false);
        if (err?.fieldErrors) {
          Object.entries(err.fieldErrors).forEach(([field, msg]) => {
            const control = this.assignForm.get(field);
            if (control) {
              control.setErrors({ serverError: msg });
              control.markAsTouched();
            }
          });
        }
        this.toastService.error('Lỗi phân ca', err.message);
      },
    });
  }

  // ── Phân ca hàng loạt ─────────────────────────────────────────────
  openBulkModal(): void {
    const branchId = this.selectedBranchId() || this.branchService.currentBranch()?.id || this.branchService.branches()[0]?.id || '';
    this.selectedBranchId.set(branchId);
    this.loadShiftsForBranch(branchId);
    this.bulkForm.reset({
      branchId,
      shiftId: this.availableShifts()[0]?.id || '',
      accountIds: [],
      workDates: [this.formatDate(new Date())],
      note: '',
    });
    this.isBulkModalVisible.set(true);
  }

  closeBulkModal(): void {
    this.isBulkModalVisible.set(false);
  }

  submitBulkForm(): void {
    if (this.bulkForm.invalid) {
      this.bulkForm.markAllAsTouched();
      return;
    }

    const val = this.bulkForm.value;
    const accountIds: string[] = val.accountIds || [];
    const workDates: string[] = val.workDates || [];

    if (accountIds.length === 0) {
      this.bulkForm.get('accountIds')?.setErrors({ required: true });
      this.bulkForm.get('accountIds')?.markAsTouched();
      return;
    }

    if (workDates.length === 0) {
      this.bulkForm.get('workDates')?.setErrors({ required: true });
      this.bulkForm.get('workDates')?.markAsTouched();
      return;
    }

    const assignments: BulkAssignItemPayload[] = [];
    for (const accId of accountIds) {
      for (const wDate of workDates) {
        assignments.push({
          shiftId: val.shiftId,
          accountId: accId,
          workDate: typeof wDate === 'string' ? wDate.trim() : this.formatDate(wDate),
          note: val.note || undefined,
        });
      }
    }

    const payload: BulkAssignShiftPayload = {
      branchId: val.branchId,
      assignments,
    };

    this.isSavingBulk.set(true);
    this.shiftService.bulkAssignShifts(payload).subscribe({
      next: list => {
        this.isSavingBulk.set(false);
        this.isBulkModalVisible.set(false);
        const skipped = assignments.length - list.length;
        this.toastService.success('Phân ca hàng loạt thành công', skipped > 0 ? `Đã tạo ${list.length} lượt, bỏ qua ${skipped} lượt trùng` : `Đã tạo ${list.length} lượt phân ca làm việc`);
        this.loadData();
      },
      error: (err: ShiftServiceError) => {
        this.isSavingBulk.set(false);
        if (err?.fieldErrors) {
          Object.entries(err.fieldErrors).forEach(([field, msg]) => {
            const control = this.bulkForm.get(field);
            if (control) {
              control.setErrors({ serverError: msg });
              control.markAsTouched();
            }
          });
        }
        this.toastService.error('Lỗi phân ca hàng loạt', err.message);
      },
    });
  }

  // ── Hủy ca ────────────────────────────────────────────────────────
  cancelAssignment(a: ShiftAssignment): void {
    const reason = window.prompt(`Nhập lý do hủy ca của ${a.employeeName} ngày ${a.workDate}:`, 'Quản lý hủy ca trực');
    if (reason === null) return;
    this.modalService.confirm({
      nzTitle: 'Xác nhận hủy phân ca',
      nzContent: `Bạn có chắc chắn muốn hủy ca phân công cho ${a.employeeName} vào ngày ${a.workDate} không?`,
      nzOkText: 'Hủy phân ca',
      nzOkDanger: true,
      nzOnOk: () => {
        this.shiftService.cancelAssignment(a.id, reason || 'Quản lý hủy ca trực').subscribe({
          next: () => {
            this.toastService.success('Thành công', 'Đã hủy ca phân công');
            this.loadData();
          },
          error: err => this.toastService.error('Không thể hủy ca', err.message),
        });
      },
    });
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
