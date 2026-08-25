import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { AppSelectionBarComponent } from '../../../shared/app-selection-bar/app-selection-bar.component';
import { AppTableSearchInputComponent } from '../../../shared/app-table-search-input/app-table-search-input.component';
import { ColumnTextFilter } from '../../../shared/utils/column-text-filter';
import { createSortFn } from '../../../shared/helpers/table.helper';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { SupplierService } from './supplier.service';
import {
  Supplier,
  SupplierFilter,
  SupplierFormDTO,
  SupplierStatus,
  SUPPLIER_STATUS_OPTIONS,
  getSupplierStatusMeta,
} from './supplier.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-supplier-list',
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
    NzTooltipModule,
    NzGridModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    AppSelectionBarComponent,
    AppTableSearchInputComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss'],
})
export class SupplierListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly SupplierStatus = SupplierStatus;
  readonly statusOptions = SUPPLIER_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly getSupplierStatusMeta = getSupplierStatusMeta;

  // ── State signals ───────────────────────────────────────────────────
  readonly allLoadedSuppliers = signal<Supplier[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  // ── Column-based in-memory filter ───────────────────────────────────
  columnFilter = new ColumnTextFilter<Supplier>(() => this.allLoadedSuppliers(), {
    name: 'contains',
    code: 'contains',
    contactPerson: 'contains',
    phoneNumber: 'contains',
    email: 'contains',
    address: 'contains',
    status: 'equals',
  });

  readonly statusFilterOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Đang hợp tác', value: SupplierStatus.ACTIVE },
    { label: 'Ngừng hợp tác', value: SupplierStatus.INACTIVE },
  ];

  // ── Search & Filter Params ──────────────────────────────────────────
  searchQuery = '';
  selectedStatus: SupplierStatus | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // ── Selection State ─────────────────────────────────────────────────
  readonly setOfCheckedKeys = new Set<string>();
  allChecked = false;
  indeterminate = false;

  // ── Modals State ────────────────────────────────────────────────────
  readonly isFormModalVisible = signal(false);
  readonly modalMode = signal<'add' | 'view' | 'edit'>('add');
  selectedSupplierForEdit: Supplier | null = null;

  // ── Forms ───────────────────────────────────────────────────────────
  readonly supplierForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    taxCode: ['', [Validators.maxLength(30)]],
    contactPerson: ['', [Validators.maxLength(150)]],
    phoneNumber: ['', [Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    address: ['', [Validators.maxLength(255)]],
    paymentTermDays: this.fb.control<string | null>(null, [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.min(1)]),
    status: [SupplierStatus.ACTIVE, [Validators.required]],
  });

  // ── Sorting Helpers ─────────────────────────────────────────────────
  sortCodeFn = createSortFn<Supplier>('code');
  sortNameFn = createSortFn<Supplier>('name');
  sortCreatedFn = createSortFn<Supplier>('createdAt');

  private readonly supplierService = inject(SupplierService);

  // ── Derived getters ─────────────────────────────────────────────────
  get isEditMode(): boolean {
    return !!this.selectedSupplierForEdit?.id;
  }

  get isViewMode(): boolean {
    return this.modalMode() === 'view';
  }

  get formModalTitle(): string {
    const name = this.selectedSupplierForEdit?.name || '';
    if (this.modalMode() === 'add') return 'Thêm mới nhà cung cấp';
    if (this.modalMode() === 'view') return `Chi tiết nhà cung cấp: ${name}`;
    return `Cập nhật nhà cung cấp: ${name}`;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────
  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Mua hàng', url: '/admin/procurement/suppliers/list' },
      { label: 'Nhà cung cấp', url: '/admin/procurement/suppliers/list' },
    ]);

    this.loadData();
  }

  // ── Data Loading ────────────────────────────────────────────────────
  loadData(): void {
    this.loading.set(true);
    const filter: SupplierFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };

    this.supplierService
      .getSuppliers(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.allLoadedSuppliers.set(res.items);
          this.suppliers.set(this.columnFilter.hasActiveFilters ? this.columnFilter.apply() : res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.refreshCheckState();
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách nhà cung cấp.');
        },
      });
  }

  // ── Filter Methods ──────────────────────────────────────────────────
  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = null;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.columnFilter.reset();
    this.loadData();
    this.toastService.info('Đã đặt lại bộ lọc');
  }

  searchByField(field: keyof Supplier, value: unknown): void {
    const filtered = this.columnFilter.setField(field, value);
    this.suppliers.set(filtered);
    this.refreshCheckState();
  }

  resetAllFieldFilter(): void {
    const resetList = this.columnFilter.reset();
    this.suppliers.set(resetList);
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

  // ── Selection Methods ───────────────────────────────────────────────
  onCheckAll(checked: boolean): void {
    this.suppliers().forEach(row => {
      if (checked) {
        this.setOfCheckedKeys.add(String(row.id));
      } else {
        this.setOfCheckedKeys.delete(String(row.id));
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

  refreshCheckState(): void {
    const rows = this.suppliers();
    const count = rows.length;
    const checkedCount = rows.filter(r => this.setOfCheckedKeys.has(String(r.id))).length;

    this.allChecked = count > 0 && checkedCount === count;
    this.indeterminate = checkedCount > 0 && checkedCount < count;
  }

  // ── Modal Actions ───────────────────────────────────────────────────
  openCreateModal(): void {
    this.modalMode.set('add');
    this.selectedSupplierForEdit = null;
    this.supplierForm.reset({
      code: '',
      name: '',
      taxCode: '',
      contactPerson: '',
      phoneNumber: '',
      email: '',
      address: '',
      paymentTermDays: null,
      status: SupplierStatus.ACTIVE,
    });
    this.setFormEnabled(true);
    this.isFormModalVisible.set(true);
  }

  openViewModal(supplier: Supplier): void {
    this.modalMode.set('view');
    this.selectedSupplierForEdit = { ...supplier };
    this.supplierForm.reset({
      code: supplier.code,
      name: supplier.name,
      taxCode: supplier.taxCode || '',
      contactPerson: supplier.contactPerson || '',
      phoneNumber: supplier.phoneNumber || '',
      email: supplier.email || '',
      address: supplier.address || '',
      paymentTermDays: supplier.paymentTermDays != null ? String(supplier.paymentTermDays) : null,
      status: supplier.status,
    });
    this.setFormEnabled(false);
    this.isFormModalVisible.set(true);
  }

  enterEditMode(): void {
    this.modalMode.set('edit');
    this.setFormEnabled(true);
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
  }

  onSubmitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.supplierForm)) {
      return;
    }

    const raw = this.supplierForm.getRawValue();
    const payload: SupplierFormDTO = {
      code: (raw.code || '').trim(),
      name: (raw.name || '').trim(),
      taxCode: (raw.taxCode || '').trim() || undefined,
      contactPerson: (raw.contactPerson || '').trim() || undefined,
      phoneNumber: (raw.phoneNumber || '').trim() || undefined,
      email: (raw.email || '').trim() || undefined,
      address: (raw.address || '').trim() || undefined,
      paymentTermDays: raw.paymentTermDays != null && raw.paymentTermDays !== '' ? Number(raw.paymentTermDays) : undefined,
      status: raw.status as SupplierStatus,
    };

    this.isSaving.set(true);
    const obs =
      this.isEditMode && this.selectedSupplierForEdit
        ? this.supplierService.updateSupplier(this.selectedSupplierForEdit.id, payload)
        : this.supplierService.createSupplier(payload);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => {
        this.isSaving.set(false);
        this.toastService.success(
          'Thành công',
          this.isEditMode ? `Đã cập nhật nhà cung cấp "${saved.name}"` : `Đã thêm mới nhà cung cấp "${saved.name}"`,
        );
        this.closeFormModal();
        this.loadData();
      },
      error: err => {
        this.isSaving.set(false);
        this.toastService.error('Lỗi', err.message || 'Không thể lưu nhà cung cấp.');
      },
    });
  }

  onDelete(supplier: Supplier): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa nhà cung cấp',
      nzContent: `Hành động này sẽ xóa nhà cung cấp <strong>${supplier.name}</strong> (${supplier.code}). Hành động không thể hoàn tác!`,
      nzOkText: 'Xóa',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.supplierService
          .deleteSupplier(supplier.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', `Đã xóa nhà cung cấp "${supplier.name}".`);
              this.loadData();
            },
            error: err => {
              this.toastService.error('Lỗi', err.message || 'Không thể xóa nhà cung cấp.');
            },
          });
      },
    });
  }

  onBatchStatus(active: boolean): void {
    const ids = Array.from(this.setOfCheckedKeys);
    if (!ids.length) return;

    this.isSaving.set(true);
    this.supplierService.batchUpdateStatus(ids, active).subscribe({
      next: count => {
        this.isSaving.set(false);
        this.toastService.success('Thành công', `Đã ${active ? 'kích hoạt' : 'ngừng hợp tác với'} ${count} nhà cung cấp.`);
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
      nzContent: `Bạn có chắc chắn muốn xóa <strong>${ids.length}</strong> nhà cung cấp đã chọn?`,
      nzOkText: 'Xóa tất cả',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.isSaving.set(true);
        this.supplierService.batchDelete(ids).subscribe({
          next: count => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', `Đã xóa ${count} nhà cung cấp.`);
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

  private setFormEnabled(enabled: boolean): void {
    Object.values(this.supplierForm.controls).forEach(ctrl => {
      if (enabled) ctrl.enable();
      else ctrl.disable();
    });
  }
}
