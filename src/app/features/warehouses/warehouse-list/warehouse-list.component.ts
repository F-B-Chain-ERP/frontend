import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  Warehouse,
  WarehouseFilter,
  WAREHOUSE_TYPE_OPTIONS,
  WAREHOUSE_STATUS_OPTIONS,
  getWarehouseStatusMeta,
  getWarehouseTypeMeta,
} from './warehouse.model';
import { WarehouseService } from './warehouse.service';
import { BranchManagementService } from '../../system/branches/branch-management.service';
import { Branch } from '../../system/branches/branch.model';

@Component({
  selector: 'app-warehouse-list',
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
    NzTagModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    AppTableSearchInputComponent,
    AppSelectionBarComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './warehouse-list.component.html',
  styleUrls: ['./warehouse-list.component.scss'],
})
export class WarehouseListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;

  // Options
  readonly warehouseTypeOptions = WAREHOUSE_TYPE_OPTIONS;
  readonly statusOptions = WAREHOUSE_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // Helpers
  readonly getStatusMeta = getWarehouseStatusMeta;
  readonly getWarehouseTypeMeta = getWarehouseTypeMeta;

  // State signals
  readonly warehouses = signal<Warehouse[]>([]);
  readonly allLoadedWarehouses = signal<Warehouse[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  // Filter params
  searchQuery = '';
  selectedBranch: string | null = null;
  selectedWarehouseType: string | null = null;
  selectedStatus: string | null = null;
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
  readonly selectedWarehouse = signal<Warehouse | null>(null);

  // Column filter (client-side lọc trên trang hiện tại)
  readonly columnFilter = new ColumnTextFilter<Warehouse>(() => this.allLoadedWarehouses(), {
    code: 'contains',
    name: 'contains',
    warehouseType: 'equals',
    branchName: 'contains',
    address: 'contains',
    status: 'equals',
  });

  // Reactive form
  readonly warehouseForm: FormGroup;

  private readonly warehouseService = inject(WarehouseService);
  private readonly branchManagementService = inject(BranchManagementService);

  get modalTitle(): string {
    switch (this.modalMode()) {
      case 'create':
        return 'Thêm mới kho hàng';
      case 'edit':
        return 'Chỉnh sửa kho hàng';
      case 'view':
      default:
        return 'Chi tiết kho hàng';
    }
  }

  constructor() {
    super();
    this.warehouseForm = this.fb.group({
      id: [''],
      code: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          Validators.pattern('^[A-Z0-9_-]+$'),
        ],
      ],
      name: ['', [Validators.required, Validators.maxLength(150)]],
      warehouseType: ['BRANCH', [Validators.required]],
      branchId: [null as string | null],
      address: ['', [Validators.maxLength(255)]],
      status: ['ACTIVE'],
    });

    // Tự động điều chỉnh validator branchId theo warehouseType
    this.warehouseForm.get('warehouseType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((type: string) => {
        const branchCtrl = this.warehouseForm.get('branchId');
        if (type === 'BRANCH') {
          branchCtrl?.setValidators([Validators.required]);
        } else {
          branchCtrl?.clearValidators();
        }
        branchCtrl?.updateValueAndValidity();
      });
  }

  ngOnInit(): void {
    this.loadBranches();
    this.loadData();
  }

  // ── Load dữ liệu chi nhánh ──────────────────────────────────────
  private loadBranches(): void {
    this.branchManagementService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => this.branches.set(list || []),
        error: () => this.toastService.error('Không thể tải danh sách chi nhánh.'),
      });
  }

  // ── Load dữ liệu kho ───────────────────────────────────────────
  loadData(): void {
    this.loading.set(true);
    const filter: WarehouseFilter = {
      query: this.searchQuery,
      branchId: this.selectedBranch,
      warehouseType: this.selectedWarehouseType,
      status: this.selectedStatus,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };

    this.warehouseService
      .getWarehouses(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.warehouses.set(res.items);
          this.allLoadedWarehouses.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.refreshCheckState();
        },
        error: err => {
          this.toastService.error(err?.message || 'Không thể tải danh sách kho hàng.');
          this.loading.set(false);
        },
      });
  }

  // ── Filter Box Actions ────────────────────────────────────────────
  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.columnFilter.reset();
    this.clearSelection();
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedBranch = null;
    this.selectedWarehouseType = null;
    this.selectedStatus = null;
    this.columnFilter.reset();
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.clearSelection();
    this.loadData();
  }

  searchByField(field: keyof Warehouse, value: unknown): void {
    this.warehouses.set(this.columnFilter.setField(field, value));
    this.refreshCheckState();
  }

  resetAllFieldFilter(): void {
    this.warehouses.set(this.columnFilter.reset());
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

  // ── Selection ─────────────────────────────────────────────────────
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
    const list = this.warehouses();
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
    const list = this.warehouses();
    if (!list.length) {
      this.allChecked = false;
      this.indeterminate = false;
      return;
    }
    const checkedCount = list.filter(item => this.setOfCheckedKeys.has(item.id)).length;
    this.allChecked = checkedCount === list.length && list.length > 0;
    this.indeterminate = checkedCount > 0 && !this.allChecked;
  }

  // ── Modal Actions (Create / View / Edit) ───────────────────────────
  openCreateModal(): void {
    this.modalMode.set('create');
    this.selectedWarehouse.set(null);
    this.warehouseForm.reset({
      id: '',
      code: '',
      name: '',
      warehouseType: 'BRANCH',
      branchId: null,
      address: '',
      status: 'ACTIVE',
    });
    this.warehouseForm.enable();
    this.isModalVisible.set(true);
  }

  openViewModal(item: Warehouse): void {
    this.modalMode.set('view');
    this.selectedWarehouse.set(item);
    this.isModalVisible.set(true);
    this.warehouseService
      .getWarehouseById(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          const d = detail || item;
          this.selectedWarehouse.set(d);
          this.warehouseForm.reset({
            id: d.id,
            code: d.code,
            name: d.name,
            warehouseType: d.warehouseType || 'BRANCH',
            branchId: d.branchId || null,
            address: d.address || '',
            status: d.status || 'ACTIVE',
          });
          this.warehouseForm.disable();
        },
        error: () => this.toastService.error('Không thể tải chi tiết kho.'),
      });
  }

  openEditModal(item: Warehouse): void {
    this.modalMode.set('edit');
    this.selectedWarehouse.set(item);
    this.isModalVisible.set(true);
    this.warehouseService
      .getWarehouseById(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          const d = detail || item;
          this.selectedWarehouse.set(d);
          this.warehouseForm.reset({
            id: d.id,
            code: d.code,
            name: d.name,
            warehouseType: d.warehouseType || 'BRANCH',
            branchId: d.branchId || null,
            address: d.address || '',
            status: d.status || 'ACTIVE',
          });
          this.warehouseForm.enable();
          this.warehouseForm.get('code')?.disable();
        },
        error: () => this.toastService.error('Không thể tải chi tiết kho.'),
      });
  }

  enterEditMode(): void {
    this.modalMode.set('edit');
    this.warehouseForm.enable();
    this.warehouseForm.get('code')?.disable();
  }

  closeModal(): void {
    this.isModalVisible.set(false);
    this.warehouseForm.reset();
  }

  submitForm(): void {
    if (this.modalMode() === 'view') {
      this.closeModal();
      return;
    }

    if (!this.validateAndFocusFirstInvalid(this.warehouseForm)) {
      return;
    }

    this.isSaving.set(true);
    const formRaw = this.warehouseForm.getRawValue();
    const payload: Partial<Warehouse> = {
      code: formRaw.code?.trim().toUpperCase(),
      name: formRaw.name?.trim(),
      warehouseType: formRaw.warehouseType,
      branchId: formRaw.branchId || null,
      address: formRaw.address?.trim() || null,
      status: formRaw.status || 'ACTIVE',
    };

    if (this.modalMode() === 'create') {
      this.warehouseService
        .createWarehouse(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success('Thêm mới kho thành công.');
            this.isSaving.set(false);
            this.closeModal();
            this.loadData();
          },
          error: err => {
            this.toastService.error(err?.message || 'Có lỗi xảy ra khi tạo kho.');
            this.isSaving.set(false);
          },
        });
    } else {
      const id = this.selectedWarehouse()?.id || formRaw.id || '';
      this.warehouseService
        .updateWarehouse(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success('Cập nhật kho thành công.');
            this.isSaving.set(false);
            this.closeModal();
            this.loadData();
          },
          error: err => {
            this.toastService.error(err?.message || 'Có lỗi xảy ra khi cập nhật kho.');
            this.isSaving.set(false);
          },
        });
    }
  }


  // ── Delete ────────────────────────────────────────────────────────
  onDelete(item: Warehouse): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa kho',
      nzContent: `Bạn có chắc chắn muốn xóa kho "<strong>${item.name}</strong>" (${item.code})? Hành động này không thể hoàn tác nếu kho chưa phát sinh dữ liệu.`,
      nzOkText: 'Xác nhận xóa',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        this.warehouseService
          .deleteWarehouse(item.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã xóa kho "${item.name}" thành công.`);
              this.setOfCheckedKeys.delete(item.id);
              this.loadData();
            },
            error: err => {
              this.toastService.error(err?.message || 'Xóa kho thất bại. Kho có thể đã phát sinh dữ liệu.');
            },
          });
      },
    });
  }

  // ── Batch Delete ──────────────────────────────────────────────────
  onBatchDelete(): void {
    const ids = Array.from(this.setOfCheckedKeys);
    if (!ids.length) return;

    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa hàng loạt',
      nzContent: `Bạn có chắc chắn muốn xóa <strong>${ids.length}</strong> kho đã chọn?`,
      nzOkText: 'Xác nhận xóa',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        this.warehouseService
          .batchDeleteWarehouses(ids)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã xóa ${ids.length} kho.`);
              this.clearSelection();
              this.loadData();
            },
            error: err => {
              this.toastService.error(err?.message || 'Một số kho không thể xóa do đã phát sinh giao dịch.');
              this.loadData();
            },
          });
      },
    });
  }
}
