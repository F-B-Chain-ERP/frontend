import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { SupplierMaterialService } from './supplier-material.service';
import { MaterialService } from './material.service';
import {
  SupplierMaterial,
  SupplierMaterialFilter,
  CreateSupplierMaterialRequest,
  UpdateSupplierMaterialRequest,
  Material,
  getSupplierMaterialStatusMeta,
} from './supplier-material.model';
import { SupplierService } from '../suppliers/supplier.service';
import { Supplier } from '../suppliers/supplier.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs';

function positiveNumberValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }
    const n = Number(control.value);
    return !Number.isNaN(n) && n > 0 ? null : { positive: true };
  };
}

function integerMinValidator(min: number): ValidatorFn {
  return (control: AbstractControl) => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }
    const n = Number(control.value);
    return !Number.isNaN(n) && Number.isInteger(n) && n >= min ? null : { minInteger: true };
  };
}

@Component({
  selector: 'app-supplier-material-list',
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
    NzSwitchModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './supplier-material-list.component.html',
  styleUrls: ['./supplier-material-list.component.scss'],
})
export class SupplierMaterialListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly getSupplierMaterialStatusMeta = getSupplierMaterialStatusMeta;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // ── State signals ───────────────────────────────────────────────────
  readonly supplierMaterials = signal<SupplierMaterial[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  // ── Dropdown data ───────────────────────────────────────────────────
  suppliers: Supplier[] = [];
  materials: Material[] = [];

  selectedSupplierId: string | null = null;
  searchQuery = '';
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // ── Modals ──────────────────────────────────────────────────────────
  readonly isFormModalVisible = signal(false);
  readonly modalMode = signal<'add' | 'edit'>('add');
  selectedRecord: SupplierMaterial | null = null;

  // ── Form ────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    materialId: this.fb.control<string | null>(null, [Validators.required]),
    supplierSku: this.fb.control<string | null>(null),
    purchasePrice: this.fb.control<string | null>(null, [Validators.required, positiveNumberValidator()]),
    leadTimeDays: this.fb.control<string | null>(null, [Validators.required, integerMinValidator(1)]),
    isPreferred: this.fb.control<boolean>(false),
  });

  private readonly supplierMaterialService = inject(SupplierMaterialService);
  private readonly materialService = inject(MaterialService);
  private readonly supplierService = inject(SupplierService);

  get selectedMaterialDisplay(): string {
    if (!this.selectedRecord) {
      return '';
    }
    const m = this.materials.find(x => x.id === this.selectedRecord!.materialId);
    if (m) {
      return `${m.code} - ${m.name}`;
    }
    return this.selectedRecord.materialName ?? this.selectedRecord.materialId;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────
  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Mua hàng', url: '/admin/procurement/purchase-orders/list' },
      { label: 'Nhà cung cấp', url: '/admin/procurement/suppliers/list' },
      { label: 'Bảng giá nguyên vật liệu', url: '/admin/procurement/supplier-materials/list' },
    ]);
    this.loadSuppliers();
    this.loadMaterials();
  }

  // ── Data loading ────────────────────────────────────────────────────
  private loadSuppliers(): void {
    this.supplierService
      .getSuppliers({ query: '', status: null, pageIndex: 1, pageSize: 10 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.suppliers = res.items;
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách nhà cung cấp.'),
      });
  }

  private loadMaterials(): void {
    this.materialService
      .getMaterials()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          this.materials = list.filter(m => m.status === 'ACTIVE');
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách nguyên vật liệu.'),
      });
  }

  onSupplierChange(id: string | null): void {
    this.selectedSupplierId = id;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  loadData(): void {
    if (!this.selectedSupplierId) {
      this.supplierMaterials.set([]);
      this.total.set(0);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const filter: SupplierMaterialFilter = {
      query: this.searchQuery,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };
    this.supplierMaterialService
      .getBySupplier(this.selectedSupplierId, filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.supplierMaterials.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải bảng giá nguyên vật liệu.');
        },
      });
  }

  // ── Filter / Pagination ─────────────────────────────────────────────
  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
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

  // ── Modal actions ───────────────────────────────────────────────────
  openCreateModal(): void {
    if (!this.selectedSupplierId) {
      this.toastService.warning('Thông báo', 'Vui lòng chọn nhà cung cấp trước khi gán nguyên vật liệu.');
      return;
    }
    this.modalMode.set('add');
    this.selectedRecord = null;
    this.form.get('materialId')?.enable();
    this.form.reset({
      materialId: null,
      supplierSku: null,
      purchasePrice: null,
      leadTimeDays: null,
      isPreferred: false,
    });
    this.isFormModalVisible.set(true);
  }

  openEditModal(record: SupplierMaterial): void {
    this.modalMode.set('edit');
    this.selectedRecord = { ...record };
    this.form.reset({
      materialId: record.materialId,
      supplierSku: record.supplierSku ?? null,
      purchasePrice: record.purchasePrice != null ? String(record.purchasePrice) : null,
      leadTimeDays: record.leadTimeDays != null ? String(record.leadTimeDays) : null,
      isPreferred: record.isPreferred,
    });
    this.form.get('materialId')?.disable();
    this.isFormModalVisible.set(true);
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
  }

  onSubmitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.form)) {
      return;
    }
    if (!this.selectedSupplierId) {
      this.toastService.error('Lỗi', 'Vui lòng chọn nhà cung cấp trước khi gán nguyên vật liệu.');
      return;
    }

    const raw = this.form.getRawValue();
    const base = {
      supplierSku: (raw.supplierSku || '').trim() || null,
      purchasePrice: Number(raw.purchasePrice),
      leadTimeDays: Number(raw.leadTimeDays),
      isPreferred: !!raw.isPreferred,
    };

    this.isSaving.set(true);

    if (this.modalMode() === 'edit' && this.selectedRecord) {
      const req: UpdateSupplierMaterialRequest = {
        supplierId: this.selectedRecord.supplierId,
        materialId: this.selectedRecord.materialId,
        ...base,
        status: this.selectedRecord.status,
      };
      this.supplierMaterialService
        .update(this.selectedRecord.id, req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã cập nhật bảng giá nguyên vật liệu.');
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể cập nhật bảng giá nguyên vật liệu.');
          },
        });
    } else {
      const req: CreateSupplierMaterialRequest = {
        supplierId: this.selectedSupplierId,
        materialId: raw.materialId as string,
        ...base,
        status: null,
      };
      this.supplierMaterialService
        .create(this.selectedSupplierId, req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã gán nguyên vật liệu cho nhà cung cấp.');
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể gán nguyên vật liệu.');
          },
        });
    }
  }

  onDelete(record: SupplierMaterial): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận gỡ nguyên vật liệu',
      nzContent: `Bạn có chắc muốn gỡ nguyên vật liệu <strong>${record.materialName ?? ''}</strong> khỏi nhà cung cấp?`,
      nzOkText: 'Gỡ khỏi nhà cung cấp',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.supplierMaterialService
          .delete(record.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', 'Đã gỡ nguyên vật liệu khỏi nhà cung cấp.');
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể gỡ nguyên vật liệu.'),
          });
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  materialCode(id: string | undefined): string {
    if (!id) {
      return '—';
    }
    return this.materials.find(m => m.id === id)?.code ?? '—';
  }

  materialName(id: string | undefined, fallback?: string): string {
    if (!id) {
      return '—';
    }
    return this.materials.find(m => m.id === id)?.name ?? fallback ?? '—';
  }
}
