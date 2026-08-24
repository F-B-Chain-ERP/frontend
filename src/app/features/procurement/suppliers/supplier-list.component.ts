import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzGridModule } from 'ng-zorro-antd/grid';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { SupplierService } from './supplier.service';
import { Supplier, SupplierFilter, SupplierFormDTO, SupplierStatus, SUPPLIER_STATUS_OPTIONS, getSupplierStatusMeta } from './supplier.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs/operators';

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
    NzRadioModule,
    NzGridModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
  ],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss'],
})
export class SupplierListComponent extends BaseComponent implements OnInit {
  readonly SupplierStatus = SupplierStatus;
  readonly statusOptions = SUPPLIER_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // State signals
  readonly suppliers = signal<Supplier[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  // Filter params
  searchQuery = '';
  selectedStatus: SupplierStatus | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  private readonly supplierService = inject(SupplierService);

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Mua hàng', url: '/admin/procurement/suppliers/list' },
      { label: 'Nhà cung cấp', url: '/admin/procurement/suppliers/list' },
    ]);

    this.loadData();
  }

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
          this.suppliers.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách nhà cung cấp.');
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
    this.loadData();
    this.toastService.info('Đã đặt lại bộ lọc');
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

  /**
   * TODO(S2-10): thay bằng mở modal thêm mới / sửa NCC khi làm form
   */
  openFormPlaceholder(mode: 'create' | 'edit'): void {
    const action = mode === 'create' ? 'Thêm mới' : 'Cập nhật';
    this.toastService.info('Đang phát triển', `Chức năng ${action.toLowerCase()} nhà cung cấp sẽ được phát triển ở task S2-10.`);
  }

  getStatusMeta(status: SupplierStatus): ReturnType<typeof getSupplierStatusMeta> {
    return getSupplierStatusMeta(status);
  }

  // ── Form (Thêm mới / Cập nhật) ──────────────────────────────────────
  readonly isFormModalVisible = signal(false);
  readonly isSaving = signal(false);
  selectedSupplierForEdit: Supplier | null = null;

  get isEditMode(): boolean {
    return !!this.selectedSupplierForEdit?.id;
  }

  get formModalTitle(): string {
    return this.isEditMode
      ? `Cập nhật nhà cung cấp: ${this.selectedSupplierForEdit?.name || ''}`
      : 'Thêm mới nhà cung cấp';
  }

  readonly supplierForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    taxCode: ['', [Validators.maxLength(30)]],
    contactPerson: ['', [Validators.maxLength(150)]],
    phoneNumber: ['', [Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    address: ['', [Validators.maxLength(255)]],
    paymentTermDays: [0 as number | null],
    status: [SupplierStatus.ACTIVE, [Validators.required]],
  });

  openCreateModal(): void {
    this.selectedSupplierForEdit = null;
    this.supplierForm.reset({
      code: '',
      name: '',
      taxCode: '',
      contactPerson: '',
      phoneNumber: '',
      email: '',
      address: '',
      paymentTermDays: 0,
      status: SupplierStatus.ACTIVE,
    });
    this.isFormModalVisible.set(true);
  }

  openEditModal(supplier: Supplier): void {
    this.selectedSupplierForEdit = { ...supplier };
    this.supplierForm.reset({
      code: supplier.code,
      name: supplier.name,
      taxCode: supplier.taxCode || '',
      contactPerson: supplier.contactPerson || '',
      phoneNumber: supplier.phoneNumber || '',
      email: supplier.email || '',
      address: supplier.address || '',
      paymentTermDays: supplier.paymentTermDays ?? 0,
      status: supplier.status,
    });
    this.isFormModalVisible.set(true);
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
      paymentTermDays: raw.paymentTermDays != null ? Number(raw.paymentTermDays) : undefined,
      status: raw.status as SupplierStatus,
    };

    this.isSaving.set(true);
    const obs = this.isEditMode && this.selectedSupplierForEdit
      ? this.supplierService.updateSupplier(this.selectedSupplierForEdit.id, payload)
      : this.supplierService.createSupplier(payload);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => {
        this.isSaving.set(false);
        this.toastService.success(
          'Thành công',
          this.isEditMode
            ? `Đã cập nhật nhà cung cấp "${saved.name}"`
            : `Đã thêm mới nhà cung cấp "${saved.name}"`,
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
        this.supplierService.deleteSupplier(supplier.id).pipe(takeUntil(this.destroy$)).subscribe({
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

  onToggleStatus(supplier: Supplier): void {
    const next = supplier.status === SupplierStatus.ACTIVE ? SupplierStatus.INACTIVE : SupplierStatus.ACTIVE;
    const label = next === SupplierStatus.ACTIVE ? 'kích hoạt' : 'ngừng hợp tác với';
    this.modalService.confirm({
      nzTitle: 'Xác nhận đổi trạng thái',
      nzContent: `Bạn có chắc muốn ${label} nhà cung cấp <strong>${supplier.name}</strong>?`,
      nzOkText: 'Xác nhận',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.supplierService.toggleStatus(supplier.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: updated => {
            this.toastService.success('Thành công', `Đã cập nhật trạng thái nhà cung cấp "${updated.name}".`);
            this.loadData();
          },
          error: err => {
            this.toastService.error('Lỗi', err.message || 'Không thể đổi trạng thái.');
          },
        });
      },
    });
  }
}
