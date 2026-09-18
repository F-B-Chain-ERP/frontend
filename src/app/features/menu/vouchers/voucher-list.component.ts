import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { AppSelectionBarComponent } from '../../../shared/app-selection-bar/app-selection-bar.component';
import { AppTableSearchInputComponent } from '../../../shared/app-table-search-input/app-table-search-input.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { EnterAsTabContainerDirective } from '../../../shared/directives/enter-as-tab-container.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { createSortFn } from '../../../shared/helpers/table.helper';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VoucherService } from './voucher.service';
import { BranchManagementService } from '../../system/branches/branch-management.service';
import { Branch } from '../../system/branches/branch.model';
import {
  Voucher,
  VoucherBranch,
  VoucherDiscountType,
  VoucherFilter,
  VoucherFormDTO,
  VoucherStatus,
  VoucherUsage,
  VOUCHER_STATUS_OPTIONS,
  getVoucherStatusMeta,
  getDiscountTypeLabel,
  getDiscountLabel,
  formatInstant,
} from './voucher.model';

@Component({
  selector: 'app-voucher-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    NzTagModule,
    NzTooltipModule,
    NzGridModule,
    NzInputNumberModule,
    NzDatePickerModule,
    NzDrawerModule,
    NzDescriptionsModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    AppSelectionBarComponent,
    AppTableSearchInputComponent,
    EnterAsTabContainerDirective,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './voucher-list.component.html',
  styleUrls: ['./voucher-list.component.scss'],
})
export class VoucherListComponent extends BaseComponent implements OnInit {
  // ── Public instance fields ───────────────────────────────────────────
  readonly ROLE = ROLE;
  readonly VOUCHER_STATUS_OPTIONS = VOUCHER_STATUS_OPTIONS;
  readonly getVoucherStatusMeta = getVoucherStatusMeta;
  readonly getDiscountTypeLabel = getDiscountTypeLabel;
  readonly getDiscountLabel = getDiscountLabel;
  readonly formatInstant = formatInstant;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly statusFilterOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Đang hoạt động', value: 'ACTIVE' },
    { label: 'Ngừng hoạt động', value: 'INACTIVE' },
  ];
  readonly discountTypeFilterOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Phần trăm (%)', value: 'PERCENT' },
    { label: 'Số tiền cố định', value: 'FIXED' },
  ];

  // ── State signals ─────────────────────────────────────────────────────
  readonly allLoadedVouchers = signal<Voucher[]>([]);
  readonly vouchers = signal<Voucher[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  // ── Column-based in-memory filter ─────────────────────────────────────
  readonly columnDisplay = new Map<keyof Voucher, unknown>();

  // ── Search & Filter Params ────────────────────────────────────────────
  searchQuery = '';
  selectedStatus: VoucherStatus | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // ── Selection State ───────────────────────────────────────────────────
  readonly setOfCheckedKeys = new Set<string>();
  allChecked = false;
  indeterminate = false;

  // ── Form Modal State ──────────────────────────────────────────────────
  readonly isFormModalVisible = signal(false);
  readonly modalMode = signal<'add' | 'edit'>('add');
  selectedVoucherForEdit: Voucher | null = null;

  // ── Detail Drawer State ───────────────────────────────────────────────
  readonly isDrawerVisible = signal(false);
  detailVoucher: Voucher | null = null;
  readonly detailBranches = signal<VoucherBranch[]>([]);
  readonly detailBranchOptions = signal<{ label: string; value: string }[]>([]);
  readonly usageItems = signal<VoucherUsage[]>([]);
  readonly usageTotal = signal(0);
  readonly usageLoading = signal(false);
  selectedBranchToAdd: string | null = null;
  usagePageIndex = DEFAULT_PAGE_INDEX;
  usagePageSize = 10;

  // ── Reactive Form ─────────────────────────────────────────────────────
  readonly voucherForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/^[A-Z0-9_-]+$/)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(500)]],
    discountType: ['PERCENT' as VoucherDiscountType, [Validators.required]],
    discountValue: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    maxDiscountAmount: this.fb.control<number | null>(null, [Validators.min(0)]),
    minOrderAmount: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
    usageLimit: this.fb.control<number | null>(null, [Validators.min(0)]),
    usageLimitPerCustomer: this.fb.control<number | null>(null, [Validators.min(0), c => this.validateUsageLimitPerCustomer(c)]),
    startAt: this.fb.control<Date | null>(null, [Validators.required]),
    endAt: this.fb.control<Date | null>(null, [Validators.required]),
    status: ['ACTIVE' as VoucherStatus, [Validators.required]],
  });

  // ── Sorting Helpers ───────────────────────────────────────────────────
  sortCodeFn = createSortFn<Voucher>('code');
  sortNameFn = createSortFn<Voucher>('name');
  sortStatusFn = createSortFn<Voucher>('status');
  sortStartAtFn = createSortFn<Voucher>('startAt');

  // ── Private instance fields ───────────────────────────────────────────
  private allBranches: Branch[] = [];
  private readonly voucherService = inject(VoucherService);
  private readonly branchManagementService = inject(BranchManagementService);

  // ── Getters ───────────────────────────────────────────────────────────
  get isEditMode(): boolean {
    return !!this.selectedVoucherForEdit?.id;
  }

  get formModalTitle(): string {
    const code = this.selectedVoucherForEdit?.code || '';
    return this.isEditMode ? `Cập nhật voucher: ${code}` : 'Thêm mới voucher';
  }

  get hasColumnFilters(): boolean {
    return this.columnDisplay.size > 0;
  }

  // ── Public instance methods ───────────────────────────────────────────
  columnValue(field: keyof Voucher): unknown {
    return this.columnDisplay.get(field) ?? '';
  }

  /** Không cho chọn ngày kết thúc trước ngày bắt đầu. */
  disabledEndDate = (current: Date): boolean => {
    const start = this.voucherForm.get('startAt')?.value;
    if (!start) return false;
    return current.getTime() < new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  };

  /** Cross-field: lượt dùng mỗi khách không được vượt quá tổng lượt dùng tối đa. */
  private validateUsageLimitPerCustomer(control: AbstractControl): ValidationErrors | null {
    const perCustomer = control.value as number | null;
    if (perCustomer == null || perCustomer <= 0) {
      return null;
    }
    const total = control.parent?.get('usageLimit')?.value as number | null;
    if (total == null || total <= 0) {
      return null;
    }
    return perCustomer > total ? { usageLimitPerCustomerExceedsUsageLimit: true } : null;
  }

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Thực đơn', url: '/admin/menu/vouchers/list' },
      { label: 'Voucher', url: '/admin/menu/vouchers/list' },
    ]);

    this.voucherForm
      .get('discountType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((type: VoucherDiscountType | null) => this.syncDiscountValidators(type ?? 'FIXED'));

    this.voucherForm
      .get('usageLimit')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.voucherForm.get('usageLimitPerCustomer')?.updateValueAndValidity());

    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const filter: VoucherFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };

    this.voucherService
      .getVouchers(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.allLoadedVouchers.set(res.items);
          this.vouchers.set(this.hasColumnFilters ? this.applyColumnFilters() : res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.refreshCheckState();
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách voucher.');
        },
      });
  }

  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = null;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.columnDisplay.clear();
    this.loadData();
    this.toastService.info('Đã đặt lại bộ lọc');
  }

  searchByField(field: keyof Voucher, value: unknown): void {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      this.columnDisplay.delete(field);
    } else {
      this.columnDisplay.set(field, value);
    }
    this.vouchers.set(this.applyColumnFilters());
    this.refreshCheckState();
  }

  resetAllFieldFilter(): void {
    this.columnDisplay.clear();
    this.vouchers.set(this.allLoadedVouchers());
    this.refreshCheckState();
    this.toastService.info('Đã đặt lại bộ lọc theo cột');
  }

  onPageIndexChange(page: number): void {
    this.pageIndex = page;
    this.loadData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onCheckAll(checked: boolean): void {
    this.vouchers().forEach(row => {
      if (checked) {
        this.setOfCheckedKeys.add(row.id);
      } else {
        this.setOfCheckedKeys.delete(row.id);
      }
    });
    this.refreshCheckState();
  }

  onCheckRow(id: string | number, checked: boolean): void {
    if (checked) {
      this.setOfCheckedKeys.add(String(id));
    } else {
      this.setOfCheckedKeys.delete(String(id));
    }
    this.refreshCheckState();
  }

  isChecked(id: string | number): boolean {
    return this.setOfCheckedKeys.has(String(id));
  }

  clearSelection(): void {
    this.setOfCheckedKeys.clear();
    this.refreshCheckState();
  }

  openCreateModal(): void {
    this.modalMode.set('add');
    this.selectedVoucherForEdit = null;
    this.voucherForm.reset({
      code: '',
      name: '',
      description: '',
      discountType: 'PERCENT',
      discountValue: null,
      maxDiscountAmount: null,
      minOrderAmount: 0,
      usageLimit: null,
      usageLimitPerCustomer: null,
      startAt: null,
      endAt: null,
      status: 'ACTIVE',
    });
    this.syncDiscountValidators('PERCENT');
    this.isFormModalVisible.set(true);
  }

  openEditModal(voucher: Voucher): void {
    this.modalMode.set('edit');
    this.selectedVoucherForEdit = { ...voucher };
    this.voucherForm.reset({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description ?? '',
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscountAmount: voucher.maxDiscountAmount ?? null,
      minOrderAmount: voucher.minOrderAmount,
      usageLimit: voucher.usageLimit ?? null,
      usageLimitPerCustomer: voucher.usageLimitPerCustomer ?? null,
      startAt: new Date(voucher.startAt),
      endAt: new Date(voucher.endAt),
      status: voucher.status,
    });
    this.syncDiscountValidators(voucher.discountType);
    this.isFormModalVisible.set(true);
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
  }

  onSubmitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.voucherForm)) {
      return;
    }

    const raw = this.voucherForm.getRawValue();
    const startAt = raw.startAt;
    const endAt = raw.endAt;
    if (!startAt || !endAt) {
      return;
    }
    if (startAt.getTime() >= endAt.getTime()) {
      this.toastService.error('Lỗi', 'Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    const payload: VoucherFormDTO = {
      code: (raw.code ?? '').trim(),
      name: (raw.name ?? '').trim(),
      description: (raw.description ?? '').trim() || undefined,
      discountType: raw.discountType ?? 'FIXED',
      discountValue: raw.discountValue ?? 0,
      maxDiscountAmount: raw.maxDiscountAmount ?? null,
      minOrderAmount: raw.minOrderAmount ?? 0,
      usageLimit: raw.usageLimit ?? null,
      usageLimitPerCustomer: raw.usageLimitPerCustomer ?? null,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      status: raw.status ?? 'INACTIVE',
    };

    this.isSaving.set(true);
    const obs =
      this.isEditMode && this.selectedVoucherForEdit
        ? this.voucherService.updateVoucher(this.selectedVoucherForEdit.id, payload)
        : this.voucherService.createVoucher(payload);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => {
        this.isSaving.set(false);
        this.toastService.success(
          'Thành công',
          this.isEditMode ? `Đã cập nhật voucher "${saved.code}"` : `Đã thêm mới voucher "${saved.code}"`,
        );
        this.closeFormModal();
        this.loadData();
      },
      error: err => {
        this.isSaving.set(false);
        this.toastService.error('Lỗi', err.message || 'Không thể lưu voucher.');
      },
    });
  }

  onDelete(voucher: Voucher): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa voucher',
      nzContent: `Hành động này sẽ ngừng hoạt động voucher <strong>${voucher.code}</strong> (${voucher.name}). Hành động không thể hoàn tác!`,
      nzOkText: 'Xóa',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.voucherService
          .deleteVoucher(voucher.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', `Đã xóa voucher "${voucher.code}".`);
              this.setOfCheckedKeys.delete(voucher.id);
              this.loadData();
            },
            error: err => {
              this.toastService.error('Lỗi', err.message || 'Không thể xóa voucher.');
            },
          });
      },
    });
  }

  onBatchChangeStatus(active: boolean): void {
    const ids = Array.from(this.setOfCheckedKeys);
    if (!ids.length) return;

    const label = active ? 'kích hoạt' : 'ngừng hoạt động';
    const target: VoucherStatus = active ? 'ACTIVE' : 'INACTIVE';
    this.isSaving.set(true);
    forkJoin(ids.map(id => this.voucherService.updateStatus(id, target)))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastService.success('Thành công', `Đã ${label} ${ids.length} voucher.`);
          this.clearSelection();
          this.loadData();
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err.message || 'Thao tác hàng loạt thất bại.');
        },
      });
  }

  onBatchDelete(): void {
    const ids = Array.from(this.setOfCheckedKeys);
    if (!ids.length) return;

    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa hàng loạt',
      nzContent: `Bạn có chắc chắn muốn xóa <strong>${ids.length}</strong> voucher đã chọn?`,
      nzOkText: 'Xóa tất cả',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.isSaving.set(true);
        forkJoin(ids.map(id => this.voucherService.deleteVoucher(id)))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isSaving.set(false);
              this.toastService.success('Thành công', `Đã xóa ${ids.length} voucher.`);
              this.clearSelection();
              this.loadData();
            },
            error: err => {
              this.isSaving.set(false);
              this.toastService.error('Lỗi', err.message || 'Xóa hàng loạt thất bại.');
            },
          });
      },
    });
  }

  openDetailDrawer(voucher: Voucher): void {
    this.detailVoucher = { ...voucher };
    this.selectedBranchToAdd = null;
    this.usagePageIndex = DEFAULT_PAGE_INDEX;
    this.isDrawerVisible.set(true);
    this.loadDetail(voucher.id);
  }

  closeDetailDrawer(): void {
    this.isDrawerVisible.set(false);
    this.detailVoucher = null;
  }

  onEditFromDrawer(): void {
    const v = this.detailVoucher;
    if (!v) return;
    this.closeDetailDrawer();
    this.openEditModal(v);
  }

  onToggleStatus(): void {
    const v = this.detailVoucher;
    if (!v) return;

    const target: VoucherStatus = v.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const label = target === 'ACTIVE' ? 'kích hoạt' : 'ngừng hoạt động';
    this.modalService.confirm({
      nzTitle: `Xác nhận ${label} voucher`,
      nzContent: `Bạn có chắc muốn ${label} voucher <strong>${v.code}</strong>?`,
      nzOkText: target === 'ACTIVE' ? 'Kích hoạt' : 'Ngừng hoạt động',
      nzOkDanger: target === 'INACTIVE',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.voucherService
          .updateStatus(v.id, target)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: updated => {
              this.toastService.success('Thành công', `Đã ${label} voucher "${updated.code}".`);
              this.detailVoucher = updated;
              this.loadData();
            },
            error: err => {
              this.toastService.error('Lỗi', err.message || 'Không thể cập nhật trạng thái.');
            },
          });
      },
    });
  }

  onAssignBranches(): void {
    const voucherId = this.detailVoucher?.id;
    const branchId = this.selectedBranchToAdd;
    if (!voucherId || !branchId) return;

    this.isSaving.set(true);
    this.voucherService
      .assignBranches(voucherId, [branchId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: branches => {
          this.isSaving.set(false);
          this.toastService.success('Thành công', 'Đã gán voucher cho chi nhánh.');
          this.selectedBranchToAdd = null;
          this.detailBranches.set(branches);
          this.buildBranchOptions();
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể gán chi nhánh.');
        },
      });
  }

  onRemoveBranch(branch: VoucherBranch): void {
    const voucherId = this.detailVoucher?.id;
    if (!voucherId) return;

    this.modalService.confirm({
      nzTitle: 'Xác nhận gỡ chi nhánh',
      nzContent: `Gỡ voucher khỏi chi nhánh <strong>${branch.branchName || branch.branchId}</strong>?`,
      nzOkText: 'Gỡ',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.voucherService
          .removeBranch(voucherId, branch.branchId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', 'Đã gỡ voucher khỏi chi nhánh.');
              this.loadDetail(voucherId);
            },
            error: err => {
              this.toastService.error('Lỗi', err.message || 'Không thể gỡ chi nhánh.');
            },
          });
      },
    });
  }

  onUsagePageIndexChange(page: number): void {
    this.usagePageIndex = page;
    if (this.detailVoucher) {
      this.loadUsage(this.detailVoucher.id);
    }
  }

  getUsageLabel(v: Voucher): string {
    return v.usageLimit != null ? `${v.usedCount} / ${v.usageLimit}` : `${v.usedCount} (không giới hạn)`;
  }

  // ── Private instance methods ──────────────────────────────────────────
  private refreshCheckState(): void {
    const rows = this.vouchers();
    const count = rows.length;
    const checkedCount = rows.filter(r => this.setOfCheckedKeys.has(r.id)).length;
    this.allChecked = count > 0 && checkedCount === count;
    this.indeterminate = checkedCount > 0 && checkedCount < count;
  }

  /** Lọc danh sách đã tải theo các bộ lọc cột (không phân biệt hoa/thường). */
  private applyColumnFilters(): Voucher[] {
    let result = this.allLoadedVouchers();
    this.columnDisplay.forEach((value, field) => {
      const text = String(value).trim().toLowerCase();
      if (!text) return;
      result = result.filter(item => {
        const current = String(item[field] ?? '').toLowerCase();
        return field === 'status' || field === 'discountType' ? current === text : current.includes(text);
      });
    });
    return result;
  }

  private loadDetail(voucherId: string): void {
    this.voucherService
      .getVoucherDetail(voucherId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          this.detailVoucher = detail.voucher;
          this.detailBranches.set(detail.branches);
          this.buildBranchOptions();
        },
        error: err => {
          this.toastService.error('Lỗi', err.message || 'Không thể tải chi tiết voucher.');
        },
      });
    this.loadUsage(voucherId);
    this.loadAllBranches();
  }

  private loadUsage(voucherId: string): void {
    this.usageLoading.set(true);
    this.voucherService
      .getVoucherUsage(voucherId, this.usagePageIndex, this.usagePageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.usageItems.set(res.items);
          this.usageTotal.set(res.total);
          this.usageLoading.set(false);
        },
        error: err => {
          this.usageLoading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải lịch sử sử dụng voucher.');
        },
      });
  }

  private loadAllBranches(): void {
    this.branchManagementService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: branches => {
          this.allBranches = branches ?? [];
          this.buildBranchOptions();
        },
        error: () => {
          this.allBranches = [];
          this.buildBranchOptions();
        },
      });
  }

  /** Xây danh sách chi nhánh còn lại (chưa gán) để chọn thêm vào voucher. */
  private buildBranchOptions(): void {
    const assigned = new Set(this.detailBranches().map(b => b.branchId));
    this.detailBranchOptions.set(
      this.allBranches.filter(b => !assigned.has(b.id)).map(b => ({ label: `${b.name} (${b.code})`, value: b.id })),
    );
  }

  private syncDiscountValidators(type: VoucherDiscountType): void {
    const discountValueControl = this.voucherForm.get('discountValue');
    const maxControl = this.voucherForm.get('maxDiscountAmount');

    if (type === 'PERCENT') {
      discountValueControl?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      maxControl?.enable();
    } else {
      discountValueControl?.setValidators([Validators.required, Validators.min(0)]);
      maxControl?.disable();
      maxControl?.setValue(null);
    }
    discountValueControl?.updateValueAndValidity();
    maxControl?.updateValueAndValidity();
  }
}
