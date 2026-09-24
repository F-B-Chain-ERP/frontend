import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { PayableService, SupplierOption } from './payable.service';
import { AccountsPayableRecord, PayablePayment, PAYABLE_STATUS_OPTIONS, getPayableStatusMeta } from './payable.model';

@Component({
  selector: 'app-payable-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
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
  ],
  templateUrl: './payable-list.component.html',
  styleUrls: ['./payable-list.component.scss'],
})
export class PayableListComponent implements OnInit {
  private readonly payableService = inject(PayableService);
  private readonly toast = inject(AppNotificationService);

  readonly statusOptions = PAYABLE_STATUS_OPTIONS;

  payables = signal<AccountsPayableRecord[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = '';
  selectedStatus: string | null = null;

  // Lọc NCC + hạn thanh toán + sort
  selectedSupplierId: string | null = null;
  supplierOptions = signal<SupplierOption[]>([]);
  duePreset: 'ALL' | 'OVERDUE' | '7D' | '30D' | 'CUSTOM' = 'ALL';
  dueRange: Date[] = [];
  sortBy: 'dueDate' | 'remaining' | 'createdAt' = 'dueDate';
  sortDir: 'asc' | 'desc' = 'asc';

  // Pagination (backend-driven)
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  total = signal<number>(0);

  // KPI Summary (from backend)
  totalRemainingAll = signal<number>(0);
  totalOverdueAll = signal<number>(0);

  // Detail Modal
  isDetailModalVisible = signal<boolean>(false);
  selectedPayable = signal<AccountsPayableRecord | null>(null);
  detailPayments = signal<PayablePayment[]>([]);
  isLoadingPayments = signal<boolean>(false);

  // Payment Modal
  isPaymentModalVisible = signal<boolean>(false);
  paymentAmount = 0;
  paymentNote = '';
  paymentMethod = 'BANK_TRANSFER';
  paymentReference = '';
  isSubmittingPayment = signal<boolean>(false);

  // Delete Confirm Modal
  isConfirmDeleteVisible = signal<boolean>(false);
  deleteTarget = signal<AccountsPayableRecord | null>(null);

  // Edit Modal
  isEditModalVisible = signal<boolean>(false);
  editTarget = signal<AccountsPayableRecord | null>(null);
  editPoCode = '';
  editSupplierDisplay = '';
  editInvoiceNo = '';
  editInvoiceAmount = 0;
  editDueDate: Date | null = null;
  editNote = '';
  isSubmittingEdit = signal<boolean>(false);

  // Create Modal
  isCreateModalVisible = signal<boolean>(false);
  isSubmittingCreate = signal<boolean>(false);
  createPurchaseOrderId = '';
  createSupplierDisplay = '';
  createInvoiceNo = '';
  createInvoiceAmount = 0;
  createDueDate: Date | null = null;
  createNote = '';
  poList = signal<{ id: string; poCode: string; totalAmount: number; supplierId: string; supplierName: string; paymentTermDays: number }[]>([]);

  ngOnInit(): void {
    this.loadSuppliers();
    this.loadData();
    this.loadSummary();
  }

  loadData(): void {
    this.isLoading.set(true);
    const due = this.resolveDueRange();
    this.payableService.getPayables({
      query: this.searchQuery,
      status: this.selectedStatus,
      supplierId: this.selectedSupplierId,
      dueFrom: due.from ?? null,
      dueTo: due.to ?? null,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    }).subscribe({
      next: (res) => {
        this.payables.set(res.items);
        this.total.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  loadSummary(): void {
    this.payableService.getSummary().subscribe({
      next: (summary) => {
        this.totalRemainingAll.set(summary.totalRemaining);
        this.totalOverdueAll.set(summary.totalOverdue);
      },
      error: () => {},
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

  loadSuppliers(): void {
    this.payableService.getSuppliers().subscribe({
      next: (list) => this.supplierOptions.set(list),
      error: () => this.supplierOptions.set([]),
    });
  }

  onSupplierChange(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onDuePresetChange(): void {
    if (this.duePreset !== 'CUSTOM') {
      this.dueRange = [];
    }
    this.pageIndex = 1;
    this.loadData();
  }

  onDueRangeChange(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onSortChange(column: 'remaining' | 'dueDate', order: string | null): void {
    if (!order) {
      this.sortBy = 'dueDate';
      this.sortDir = 'asc';
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

  private resolveDueRange(): { from?: string; to?: string } {
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const addDays = (base: Date, days: number) => {
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      return d;
    };
    const today = new Date();
    switch (this.duePreset) {
      case 'OVERDUE':
        return { to: fmt(addDays(today, -1)) };
      case '7D':
        return { from: fmt(today), to: fmt(addDays(today, 7)) };
      case '30D':
        return { from: fmt(today), to: fmt(addDays(today, 30)) };
      case 'CUSTOM':
        return {
          from: this.dueRange[0] ? fmt(this.dueRange[0]) : undefined,
          to: this.dueRange[1] ? fmt(this.dueRange[1]) : undefined,
        };
      default:
        return {};
    }
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = null;
    this.selectedSupplierId = null;
    this.duePreset = 'ALL';
    this.dueRange = [];
    this.sortBy = 'dueDate';
    this.sortDir = 'asc';
    this.pageIndex = 1;
    this.payableService.triggerOverdueCheck().subscribe({
      next: () => {
        this.loadData();
        this.loadSummary();
      },
    });
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

  onViewPayable(p: AccountsPayableRecord): void {
    this.selectedPayable.set(p);
    this.isDetailModalVisible.set(true);
    this.loadPayments(p.id);
  }

  loadPayments(payableId: string): void {
    this.isLoadingPayments.set(true);
    this.payableService.getPayments(payableId).subscribe({
      next: (payments) => {
        this.detailPayments.set(payments);
        this.isLoadingPayments.set(false);
      },
      error: () => this.isLoadingPayments.set(false),
    });
  }

  onCloseDetailModal(): void {
    this.isDetailModalVisible.set(false);
    this.selectedPayable.set(null);
    this.detailPayments.set([]);
  }

  onOpenPaymentModal(): void {
    const p = this.selectedPayable();
    if (!p) return;
    this.paymentAmount = p.remainingAmount;
    this.paymentNote = `Thanh toán công nợ đơn mua hàng ${p.poCode || p.id}`;
    this.paymentMethod = 'BANK_TRANSFER';
    this.paymentReference = '';
    this.isPaymentModalVisible.set(true);
  }

  onClosePaymentModal(): void {
    this.isPaymentModalVisible.set(false);
  }

  onConfirmPayment(): void {
    const p = this.selectedPayable();
    if (!p || this.paymentAmount <= 0) return;

    this.isSubmittingPayment.set(true);
    const today = new Date().toISOString().split('T')[0];
    this.payableService.recordPayment(p.id, today, this.paymentAmount, this.paymentMethod, this.paymentReference).subscribe({
      next: () => {
        this.toast.success('Thành công', `Đã ghi nhận thanh toán ${this.paymentAmount.toLocaleString()} đ`);
        this.isPaymentModalVisible.set(false);
        this.isSubmittingPayment.set(false);
        this.loadData();
        this.loadSummary();
        // Reload header chi tiết từ server (p đang giữ là snapshot cũ trước thanh toán).
        this.payableService.getPayableById(p.id).subscribe(fresh => {
          if (fresh) this.selectedPayable.set(fresh);
          this.loadPayments(p.id);
        });
      },
      error: (err) => {
        this.toast.error('Lỗi', err.message || 'Không thể ghi nhận thanh toán');
        this.isSubmittingPayment.set(false);
      },
    });
  }

  getTotalRemaining(): number {
    return this.payables().reduce((acc, curr) => acc + curr.remainingAmount, 0);
  }

  getTotalOverdue(): number {
    return this.payables()
      .filter(p => p.status === 'OVERDUE')
      .reduce((acc, curr) => acc + curr.remainingAmount, 0);
  }

  getStatusMeta(status: string) {
    return getPayableStatusMeta(status);
  }

  canEdit(p: AccountsPayableRecord): boolean {
    return p.status === 'UNPAID' && this.isSentinelDueDate(p.dueDate) && (p.paidAmount === 0);
  }

  canDelete(p: AccountsPayableRecord): boolean {
    return p.status === 'UNPAID' && (p.paidAmount === 0);
  }

  canPay(p: AccountsPayableRecord): boolean {
    return p.status !== 'PAID' && p.remainingAmount > 0;
  }

  // ── Delete Confirm Modal ──────────────────────────────────────

  onDeleteClick(p: AccountsPayableRecord): void {
    this.deleteTarget.set(p);
    this.isConfirmDeleteVisible.set(true);
  }

  onCloseDeleteModal(): void {
    this.isConfirmDeleteVisible.set(false);
    this.deleteTarget.set(null);
  }

  onConfirmDelete(): void {
    const p = this.deleteTarget();
    if (!p) return;

    this.payableService.deletePayable(p.id).subscribe({
      next: () => {
        this.toast.success('Thành công', 'Đã xóa công nợ');
        this.isConfirmDeleteVisible.set(false);
        this.deleteTarget.set(null);
        this.loadData();
        this.loadSummary();
      },
      error: (err) => {
        this.toast.error('Lỗi', err.message || 'Không thể xóa công nợ');
        this.isConfirmDeleteVisible.set(false);
      },
    });
  }

  // ── Edit Modal ──────────────────────────────────────────────

  onEditClick(p: AccountsPayableRecord): void {
    this.editTarget.set(p);
    this.editPoCode = p.poCode || '—';
    this.editSupplierDisplay = p.supplierName;
    this.editInvoiceNo = p.invoiceNo || '';
    this.editInvoiceAmount = p.invoiceAmount;
    this.editDueDate = this.isSentinelDueDate(p.dueDate) ? null : (p.dueDate ? new Date(p.dueDate) : null);
    this.editNote = '';
    this.isEditModalVisible.set(true);
  }

  onCloseEditModal(): void {
    this.isEditModalVisible.set(false);
    this.editTarget.set(null);
  }

  onConfirmEdit(): void {
    const p = this.editTarget();
    if (!p) return;

    this.isSubmittingEdit.set(true);
    const body: { invoiceNo?: string; invoiceAmount: number; dueDate?: string; note?: string } = {
      invoiceAmount: this.editInvoiceAmount,
    };
    if (this.editInvoiceNo.trim()) body.invoiceNo = this.editInvoiceNo.trim();
    if (this.editDueDate) body.dueDate = this.editDueDate.toISOString().split('T')[0];
    if (this.editNote.trim()) body.note = this.editNote.trim();

    this.payableService.updatePayable(p.id, body).subscribe({
      next: () => {
        this.toast.success('Thành công', 'Đã cập nhật công nợ');
        this.isEditModalVisible.set(false);
        this.editTarget.set(null);
        this.isSubmittingEdit.set(false);
        this.loadData();
        this.loadSummary();
      },
      error: (err) => {
        this.toast.error('Lỗi', err.message || 'Không thể cập nhật');
        this.isSubmittingEdit.set(false);
      },
    });
  }

  // ── Create Modal ────────────────────────────────────────────

  onOpenCreateModal(): void {
    this.createPurchaseOrderId = '';
    this.createSupplierDisplay = '';
    this.createInvoiceNo = '';
    this.createInvoiceAmount = 0;
    this.createDueDate = null;
    this.createNote = '';
    this.isCreateModalVisible.set(true);
    this.loadAvailablePOs();
  }

  onCloseCreateModal(): void {
    this.isCreateModalVisible.set(false);
  }

  loadAvailablePOs(): void {
    this.payableService.getAvailablePOs().subscribe({
      next: (list) => this.poList.set(list),
      error: () => this.poList.set([]),
    });
  }

  onPOSelect(poId: string): void {
    this.createPurchaseOrderId = poId;
    const po = this.poList().find(p => p.id === poId);
    if (po) {
      this.createSupplierDisplay = po.supplierName;
      this.createInvoiceAmount = po.totalAmount;
      // Tính dueDate = today + paymentTermDays
      const termDays = po.paymentTermDays || 0;
      if (termDays > 0) {
        const due = new Date();
        due.setDate(due.getDate() + termDays);
        this.createDueDate = due;
      } else {
        this.createDueDate = null;
      }
    } else {
      this.createSupplierDisplay = '';
      this.createInvoiceAmount = 0;
      this.createDueDate = null;
    }
  }

  get isCreateFormValid(): boolean {
    return !!this.createPurchaseOrderId
      && this.createInvoiceAmount > 0;
  }

  onConfirmCreate(): void {
    if (!this.isCreateFormValid) return;

    this.isSubmittingCreate.set(true);
    const body = {
      supplierId: this.poList().find(p => p.id === this.createPurchaseOrderId)?.supplierId || '',
      invoiceAmount: this.createInvoiceAmount,
      dueDate: this.createDueDate ? this.createDueDate.toISOString().split('T')[0] : undefined,
      purchaseOrderId: this.createPurchaseOrderId,
      note: this.createNote.trim() || undefined,
    };

    this.payableService.createPayable(body).subscribe({
      next: () => {
        this.toast.success('Thành công', 'Đã tạo công nợ mới');
        this.isCreateModalVisible.set(false);
        this.isSubmittingCreate.set(false);
        this.loadData();
        this.loadSummary();
      },
      error: (err) => {
        this.toast.error('Lỗi', err.message || 'Không thể tạo công nợ');
        this.isSubmittingCreate.set(false);
      },
    });
  }

  isSentinelDueDate(dueDate?: string): boolean {
    return !dueDate || dueDate.startsWith('9999');
  }

  getDueDateDisplay(dueDate?: string): string {
    if (this.isSentinelDueDate(dueDate)) {
      return 'Chưa đặt hạn';
    }
    return dueDate || '';
  }

  getDueDateClass(dueDate?: string, status?: string): string {
    if (this.isSentinelDueDate(dueDate)) {
      return 'due-date--muted';
    }
    if (status === 'OVERDUE') {
      return 'due-date--danger';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate!);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return 'due-date--danger';
    }
    if (diffDays <= 7) {
      return 'due-date--warning';
    }
    return 'due-date--success';
  }

  getDueDateIconClass(dueDate?: string, status?: string): string {
    if (this.isSentinelDueDate(dueDate)) {
      return 'payable-info-item__icon--muted';
    }
    if (status === 'OVERDUE') {
      return 'payable-info-item__icon--danger';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate!);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return 'payable-info-item__icon--danger';
    }
    if (diffDays <= 7) {
      return 'payable-info-item__icon--warning';
    }
    return 'payable-info-item__icon--success';
  }

  getRemainingClass(p: AccountsPayableRecord): string {
    if (p.remainingAmount <= 0) return '';
    if (p.status === 'OVERDUE') return 'text-danger';
    return 'text-warning';
  }
}
