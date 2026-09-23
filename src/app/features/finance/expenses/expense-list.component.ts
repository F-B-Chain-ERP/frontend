import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { ExpenseService, BranchOption } from './expense.service';
import { ExpenseRecord, EXPENSE_STATUS_OPTIONS, getExpenseStatusMeta, CENTRAL_BRANCH_VALUE } from './expense.model';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzIconModule,
    NzTagModule,
    NzModalModule,
    NzTooltipModule,
    NzGridModule,
    NzSelectModule,
    NzDatePickerModule,
    NzFormModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './expense-list.component.html',
  styleUrls: ['./expense-list.component.scss'],
})
export class ExpenseListComponent implements OnInit {
  private readonly expenseService = inject(ExpenseService);
  private readonly toast = inject(AppNotificationService);

  readonly ROLE = ROLE;
  readonly statusOptions = EXPENSE_STATUS_OPTIONS;

  /** Hằng số dùng trong template để đánh dấu lựa chọn "Chi phí trung tâm". */
  readonly centralBranchValue = CENTRAL_BRANCH_VALUE;

  expenses = signal<ExpenseRecord[]>([]);
  isLoading = signal<boolean>(false);

  searchQuery = '';
  selectedStatus: string | null = null;
  selectedBranchId: string | null = null;
  branchOptions = signal<BranchOption[]>([]);
  dateRange: Date[] = [];

  sortBy: 'expenseDate' | 'amount' | 'createdAt' = 'expenseDate';
  sortDir: 'asc' | 'desc' = 'desc';

  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  total = signal<number>(0);

  totalExpensePage = computed(() =>
    this.expenses()
      .filter(e => e.status === 'ACTIVE')
      .reduce((acc, curr) => acc + curr.amount, 0),
  );

  // Detail Modal
  isDetailModalVisible = signal<boolean>(false);
  selectedExpense = signal<ExpenseRecord | null>(null);

  // Create / Edit Modal
  formMode: 'create' | 'edit' = 'create';
  isFormModalVisible = signal<boolean>(false);
  isSubmittingForm = signal<boolean>(false);
  editTarget = signal<ExpenseRecord | null>(null);
  formBranchValue = CENTRAL_BRANCH_VALUE;
  formExpenseDate: Date | null = null;
  formCategory = '';
  formAmount: number | null = null;
  formDescription = '';

  // Delete Confirm Modal
  isConfirmDeleteVisible = signal<boolean>(false);
  deleteTarget = signal<ExpenseRecord | null>(null);

  ngOnInit(): void {
    this.loadBranchOptions();
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    let branchId: string | undefined;
    if (this.selectedBranchId && this.selectedBranchId !== CENTRAL_BRANCH_VALUE) {
      branchId = this.selectedBranchId;
    }

    this.expenseService.getExpenses({
      query: this.searchQuery,
      branchId,
      status: this.selectedStatus,
      dateFrom: this.dateRange[0] ? this.toDateString(this.dateRange[0]) : null,
      dateTo: this.dateRange[1] ? this.toDateString(this.dateRange[1]) : null,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    }).subscribe({
      next: res => {
        this.expenses.set(res.items);
        this.total.set(res.total);
        this.isLoading.set(false);
      },
      error: err => {
        this.toast.error('Lỗi', err.message || 'Không thể tải danh sách chi phí');
        this.isLoading.set(false);
      },
    });
  }

  loadBranchOptions(): void {
    this.expenseService.getBranchOptions().subscribe({
      next: list => this.branchOptions.set(list),
      error: () => this.branchOptions.set([]),
    });
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onStatusChange(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onBranchChange(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onDateRangeChange(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onSortChange(column: 'expenseDate' | 'amount', order: string | null): void {
    if (!order) {
      this.sortBy = 'expenseDate';
      this.sortDir = 'desc';
    } else {
      this.sortBy = column;
      this.sortDir = order === 'ascend' ? 'asc' : 'desc';
    }
    this.pageIndex = 1;
    this.loadData();
  }

  sortOrderFor(column: string): 'ascend' | 'descend' | null {
    if (this.sortBy !== column) return null;
    return this.sortDir === 'asc' ? 'ascend' : 'descend';
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = null;
    this.selectedBranchId = null;
    this.dateRange = [];
    this.sortBy = 'expenseDate';
    this.sortDir = 'desc';
    this.pageIndex = 1;
    this.loadData();
  }

  onPageIndexChange(index: number): void {
    this.pageIndex = index;
    this.loadData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
    this.loadData();
  }

  getStatusMeta(status: string) {
    return getExpenseStatusMeta(status);
  }

  branchDisplayName(e: ExpenseRecord): string {
    if (e.branchId) {
      return e.branchName || '—';
    }
    return 'Trung tâm (chưa phân bổ)';
  }

  isCentral(e: ExpenseRecord): boolean {
    return !e.branchId;
  }

  // ── Detail Modal ────────────────────────────────────────────────

  onViewExpense(e: ExpenseRecord): void {
    this.selectedExpense.set(e);
    this.isDetailModalVisible.set(true);
  }

  onCloseDetailModal(): void {
    this.isDetailModalVisible.set(false);
    this.selectedExpense.set(null);
  }

  getDetailExpense(): ExpenseRecord | null {
    return this.selectedExpense();
  }

  // ── Create Modal ────────────────────────────────────────────────

  onOpenCreateModal(): void {
    this.formMode = 'create';
    this.editTarget.set(null);
    this.formBranchValue = CENTRAL_BRANCH_VALUE;
    this.formExpenseDate = new Date();
    this.formCategory = '';
    this.formAmount = null;
    this.formDescription = '';
    this.isFormModalVisible.set(true);
  }

  // ── Edit Modal ──────────────────────────────────────────────────

  onOpenEditModal(e: ExpenseRecord): void {
    this.formMode = 'edit';
    this.editTarget.set(e);
    this.formBranchValue = e.branchId || CENTRAL_BRANCH_VALUE;
    this.formExpenseDate = e.expenseDate ? new Date(e.expenseDate + 'T00:00:00') : new Date();
    this.formCategory = e.expenseCategory;
    this.formAmount = e.amount;
    this.formDescription = e.description || '';
    this.isFormModalVisible.set(true);
  }

  onCloseFormModal(): void {
    this.isFormModalVisible.set(false);
    this.editTarget.set(null);
  }

  get isFormValid(): boolean {
    const category = this.formCategory.trim();
    return !!this.formExpenseDate
      && category.length > 0
      && category.length <= 50
      && (this.formAmount !== null)
      && this.formAmount >= 0;
  }

  onConfirmForm(): void {
    if (!this.isFormValid) return;

    this.isSubmittingForm.set(true);
    const payload = {
      branchId: this.formBranchValue !== CENTRAL_BRANCH_VALUE ? this.formBranchValue : undefined,
      expenseDate: this.toDateString(this.formExpenseDate!),
      expenseCategory: this.formCategory.trim(),
      amount: this.formAmount!,
      description: this.formDescription.trim() || undefined,
    };

    if (this.formMode === 'create') {
      this.expenseService.createExpense(payload).subscribe({
        next: () => {
          this.toast.success('Thành công', 'Đã ghi nhận khoản chi phí mới');
          this.isFormModalVisible.set(false);
          this.isSubmittingForm.set(false);
          this.pageIndex = 1;
          this.loadData();
        },
        error: err => {
          this.toast.error('Lỗi', err.message || 'Không thể ghi nhận chi phí');
          this.isSubmittingForm.set(false);
        },
      });
    } else {
      const target = this.editTarget();
      if (!target) {
        this.isSubmittingForm.set(false);
        return;
      }
      this.expenseService.updateExpense(target.id, payload).subscribe({
        next: () => {
          this.toast.success('Thành công', 'Đã cập nhật khoản chi phí');
          this.isFormModalVisible.set(false);
          this.editTarget.set(null);
          this.isSubmittingForm.set(false);
          this.loadData();
        },
        error: err => {
          this.toast.error('Lỗi', err.message || 'Không thể cập nhật chi phí');
          this.isSubmittingForm.set(false);
        },
      });
    }
  }

  // ── Delete Confirm Modal ────────────────────────────────────────

  onOpenDeleteModal(e: ExpenseRecord): void {
    this.deleteTarget.set(e);
    this.isConfirmDeleteVisible.set(true);
  }

  onCloseDeleteModal(): void {
    this.isConfirmDeleteVisible.set(false);
    this.deleteTarget.set(null);
  }

  onConfirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.expenseService.deleteExpense(target.id).subscribe({
      next: () => {
        this.toast.success('Thành công', 'Đã xóa (vô hiệu) khoản chi phí');
        this.isConfirmDeleteVisible.set(false);
        this.deleteTarget.set(null);
        this.loadData();
      },
      error: err => {
        this.toast.error('Lỗi', err.message || 'Không thể xóa chi phí');
        this.isConfirmDeleteVisible.set(false);
      },
    });
  }

  private toDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}