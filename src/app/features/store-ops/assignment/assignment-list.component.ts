import {Component, OnInit, inject, signal} from '@angular/core';
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

  // Available options
  readonly availableShifts = signal<Shift[]>([]);
  readonly availableUsers = signal<User[]>([]);

  // Filter params
  selectedBranchId: string | null = null;
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
  assignForm!: FormGroup;

  // Bulk Assign Modal
  readonly isBulkModalVisible = signal<boolean>(false);
  readonly isSavingBulk = signal<boolean>(false);
  bulkForm!: FormGroup;

  ngOnInit(): void {
    this.initForms();
    this.loadUsers();
    this.branchService.loadMine().subscribe(() => {
      const current = this.branchService.currentBranch();
      if (current) {
        this.selectedBranchId = current.id;
        this.loadShiftsForBranch(current.id);
      }
      this.loadData();
    });
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
    this.loading.set(true);
    const start = this.selectedStartDate ? this.formatDate(this.selectedStartDate) : undefined;
    const end = this.selectedEndDate ? this.formatDate(this.selectedEndDate) : undefined;
    const branchId = this.selectedBranchId || undefined;
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
    this.loadData();
  }

  onBranchChange(branchId: string): void {
    this.selectedBranchId = branchId;
    this.loadShiftsForBranch(branchId);
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
  openAssignModal(): void {
    const branchId = this.selectedBranchId || this.branchService.branches()[0]?.id || '';
    this.loadShiftsForBranch(branchId);
    this.assignForm.reset({
      branchId,
      shiftId: this.availableShifts()[0]?.id || '',
      accountId: '',
      workDate: this.formatDate(new Date()),
      note: '',
    });
    this.isAssignModalVisible.set(true);
  }

  closeAssignModal(): void {
    this.isAssignModalVisible.set(false);
  }

  submitAssignForm(): void {
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
    const branchId = this.selectedBranchId || this.branchService.branches()[0]?.id || '';
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
        this.toastService.success('Phân ca hàng loạt thành công', `Đã tạo ${list.length} lượt phân ca làm việc`);
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
    this.modalService.confirm({
      nzTitle: 'Xác nhận hủy phân ca',
      nzContent: `Bạn có chắc chắn muốn hủy ca phân công cho ${a.employeeName} vào ngày ${a.workDate} không?`,
      nzOkText: 'Hủy phân ca',
      nzOkDanger: true,
      nzOnOk: () => {
        this.shiftService.cancelAssignment(a.id, 'Quản lý hủy ca trực').subscribe({
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
