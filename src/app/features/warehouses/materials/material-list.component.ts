import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppTableSearchInputComponent } from '../../../shared/app-table-search-input/app-table-search-input.component';
import { AppSelectionBarComponent } from '../../../shared/app-selection-bar/app-selection-bar.component';
import { ColumnTextFilter } from '../../../shared/utils/column-text-filter';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';

import {
  Material,
  MaterialFilter,
  MATERIAL_CATEGORY_OPTIONS,
  MATERIAL_BASE_UNIT_OPTIONS,
  MATERIAL_STATUS_OPTIONS,
  MATERIAL_PERISHABLE_OPTIONS,
  getMaterialStatusMeta,
  getPerishableMeta,
} from './material.model';
import { WarehouseMaterialService } from './material.service';

@Component({
  selector: 'app-warehouse-material-list',
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
    NzDividerModule,
    NzModalModule,
    NzSpinModule,
    NzInputNumberModule,
    NzSwitchModule,
    NzTagModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    AppTableSearchInputComponent,
    AppSelectionBarComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './material-list.component.html',
  styleUrls: ['./material-list.component.scss'],
})
export class MaterialListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;

  // Options
  readonly categoryOptions = MATERIAL_CATEGORY_OPTIONS;
  readonly baseUnitOptions = MATERIAL_BASE_UNIT_OPTIONS;
  readonly statusOptions = MATERIAL_STATUS_OPTIONS;
  readonly perishableOptions = MATERIAL_PERISHABLE_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // Helpers
  readonly getStatusMeta = getMaterialStatusMeta;
  readonly getPerishableMeta = getPerishableMeta;

  // State signals
  readonly materials = signal<Material[]>([]);
  readonly allLoadedMaterials = signal<Material[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  // Filter params
  searchQuery = '';
  selectedStatus: string | null = null;
  selectedCategory: string | null = null;
  selectedPerishable: boolean | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // Selection
  readonly setOfCheckedKeys = new Set<string>();
  allChecked = false;
  indeterminate = false;

  // Modal State (Create / View / Edit)
  readonly isModalVisible = signal(false);
  readonly modalMode = signal<'create' | 'view' | 'edit'>('create');
  readonly isSaving = signal(false);
  readonly selectedMaterial = signal<Material | null>(null);

  // Column filter (client-side lọc trên trang hiện tại)
  readonly columnFilter = new ColumnTextFilter<Material>(() => this.allLoadedMaterials(), {
    code: 'contains',
    name: 'contains',
    categoryName: 'contains',
    baseUnitName: 'contains',
    status: 'equals',
  });

  readonly statusFilterOptions = [
    { label: 'Tất cả', value: '' },
    ...MATERIAL_STATUS_OPTIONS.filter(o => o.value !== null).map(o => ({ label: o.label, value: o.value })),
  ];

  // Form
  readonly materialForm = this.fb.group({
    id: [''],
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    categoryId: [null as string | null, [Validators.required]],
    baseUnitId: [null as string | null, [Validators.required]],
    minStockAlert: [10.0, [Validators.required, Validators.min(0)]],
    isPerishable: [false],
    status: ['ACTIVE', [Validators.required]],
    note: ['', [Validators.maxLength(500)]],
  });

  private readonly materialService = inject(WarehouseMaterialService);

  get modalTitle(): string {
    const mode = this.modalMode();
    if (mode === 'create') return 'Thêm mới nguyên vật liệu vào kho';
    if (mode === 'view') return 'Chi tiết nguyên vật liệu';
    return 'Cập nhật thông tin nguyên vật liệu';
  }

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Kho & Cung ứng', url: '/admin/inventory/materials/list' },
      { label: 'Nguyên vật liệu', url: '/admin/inventory/materials/list' },
    ]);

    this.loadData();
  }

  // ── Data loading ───────────────────────────────────────────────────
  loadData(): void {
    this.loading.set(true);
    const filter: MaterialFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      categoryId: this.selectedCategory,
      isPerishable: this.selectedPerishable,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };

    this.materialService
      .getMaterials(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.allLoadedMaterials.set(res.items);
          this.materials.set(this.columnFilter.hasActiveFilters ? this.columnFilter.apply() : res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.refreshCheckState();
        },
        error: () => {
          this.toastService.error('Không thể tải danh sách nguyên vật liệu.');
          this.loading.set(false);
        },
      });
  }

  // ── Search & Filter ───────────────────────────────────────────────
  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.clearSelection();
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = null;
    this.selectedCategory = null;
    this.selectedPerishable = null;
    this.columnFilter.reset();
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.clearSelection();
    this.loadData();
  }

  searchByField(field: keyof Material, value: unknown): void {
    this.materials.set(this.columnFilter.setField(field, value));
    this.refreshCheckState();
  }

  resetAllFieldFilter(): void {
    this.materials.set(this.columnFilter.reset());
    this.refreshCheckState();
  }

  // ── Pagination ────────────────────────────────────────────────────
  onPageIndexChange(page: number): void {
    this.pageIndex = page;
    this.loadData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  // ── Selection (chọn nhiều / chọn tất cả) ───────────────────────────
  isChecked(id: string): boolean {
    return this.setOfCheckedKeys.has(id);
  }

  onCheckRow(id: string, checked: boolean): void {
    if (checked) {
      this.setOfCheckedKeys.add(id);
    } else {
      this.setOfCheckedKeys.delete(id);
    }
    this.refreshCheckState();
  }

  onCheckAll(checked: boolean): void {
    const list = this.materials();
    if (checked) {
      list.forEach(item => this.setOfCheckedKeys.add(item.id));
    } else {
      list.forEach(item => this.setOfCheckedKeys.delete(item.id));
    }
    this.refreshCheckState();
  }

  clearSelection(): void {
    this.setOfCheckedKeys.clear();
    this.refreshCheckState();
  }

  private refreshCheckState(): void {
    const list = this.materials();
    if (!list.length) {
      this.allChecked = false;
      this.indeterminate = false;
      return;
    }
    const checkedCount = list.filter(item => this.setOfCheckedKeys.has(item.id)).length;
    this.allChecked = checkedCount === list.length && list.length > 0;
    this.indeterminate = checkedCount > 0 && !this.allChecked;
  }

  // ── Modal Actions (Create / View / Edit) ────────────────────────────
  openCreateModal(): void {
    this.modalMode.set('create');
    this.selectedMaterial.set(null);
    this.materialForm.reset({
      id: '',
      code: `NVL-${Date.now().toString().slice(-4)}`,
      name: '',
      categoryId: null,
      baseUnitId: null,
      minStockAlert: 10.0,
      isPerishable: false,
      status: 'ACTIVE',
      note: '',
    });
    this.materialForm.enable();
    this.isModalVisible.set(true);
  }

  openViewModal(item: Material): void {
    this.modalMode.set('view');
    this.selectedMaterial.set(item);
    this.materialForm.reset({
      id: item.id,
      code: item.code,
      name: item.name,
      categoryId: item.categoryId || null,
      baseUnitId: item.baseUnitId || null,
      minStockAlert: item.minStockAlert,
      isPerishable: item.isPerishable,
      status: item.status,
      note: item.note || '',
    });
    this.materialForm.disable();
    this.isModalVisible.set(true);
  }

  openEditModal(item: Material): void {
    this.modalMode.set('edit');
    this.selectedMaterial.set(item);
    this.materialForm.reset({
      id: item.id,
      code: item.code,
      name: item.name,
      categoryId: item.categoryId || null,
      baseUnitId: item.baseUnitId || null,
      minStockAlert: item.minStockAlert,
      isPerishable: item.isPerishable,
      status: item.status,
      note: item.note || '',
    });
    this.materialForm.enable();
    // Mã NVL giữ nguyên không cho sửa khi edit
    this.materialForm.get('code')?.disable();
    this.isModalVisible.set(true);
  }

  closeModal(): void {
    this.isModalVisible.set(false);
    this.materialForm.reset();
  }

  submitForm(): void {
    if (this.modalMode() === 'view') {
      this.closeModal();
      return;
    }

    if (!this.validateAndFocusFirstInvalid(this.materialForm)) {
      return;
    }

    this.isSaving.set(true);
    const formRaw = this.materialForm.getRawValue();
    const payload: Partial<Material> = {
      code: formRaw.code?.trim().toUpperCase(),
      name: formRaw.name?.trim(),
      categoryId: formRaw.categoryId,
      baseUnitId: formRaw.baseUnitId,
      minStockAlert: Number(formRaw.minStockAlert) || 0,
      isPerishable: Boolean(formRaw.isPerishable),
      status: formRaw.status || 'ACTIVE',
      note: formRaw.note?.trim() || '',
    };

    if (this.modalMode() === 'create') {
      this.materialService
        .createMaterial(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success('Thêm mới nguyên vật liệu thành công.');
            this.isSaving.set(false);
            this.closeModal();
            this.loadData();
          },
          error: () => {
            this.toastService.error('Có lỗi xảy ra khi tạo nguyên vật liệu.');
            this.isSaving.set(false);
          },
        });
    } else {
      const id = this.selectedMaterial()?.id || formRaw.id || '';
      this.materialService
        .updateMaterial(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success('Cập nhật nguyên vật liệu thành công.');
            this.isSaving.set(false);
            this.closeModal();
            this.loadData();
          },
          error: () => {
            this.toastService.error('Có lỗi xảy ra khi cập nhật nguyên vật liệu.');
            this.isSaving.set(false);
          },
        });
    }
  }

  // ── Delete ────────────────────────────────────────────────────────
  onDelete(item: Material): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa nguyên vật liệu',
      nzContent: `Bạn có chắc chắn muốn xóa nguyên vật liệu "${item.name}" (${item.code}) khỏi kho?`,
      nzOkText: 'Xác nhận xóa',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        this.materialService
          .deleteMaterial(item.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã xóa nguyên vật liệu ${item.code}.`);
              this.setOfCheckedKeys.delete(item.id);
              this.loadData();
            },
            error: () => {
              this.toastService.error('Không thể xóa nguyên vật liệu.');
            },
          });
      },
    });
  }

  onBatchDelete(): void {
    const selectedIds = Array.from(this.setOfCheckedKeys);
    if (!selectedIds.length) return;

    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa hàng loạt',
      nzContent: `Bạn có chắc chắn muốn xóa ${selectedIds.length} nguyên vật liệu đã chọn khỏi kho?`,
      nzOkText: 'Xác nhận xóa',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        this.materialService
          .batchDeleteMaterials(selectedIds)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã xóa thành công ${selectedIds.length} nguyên vật liệu.`);
              this.clearSelection();
              this.loadData();
            },
            error: () => {
              this.toastService.error('Có lỗi xảy ra khi xóa hàng loạt.');
            },
          });
      },
    });
  }
}
