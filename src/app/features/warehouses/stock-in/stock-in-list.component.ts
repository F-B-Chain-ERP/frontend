import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
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
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

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
  StockIn,
  StockInFilter,
  StockInItem,
  STOCK_IN_WAREHOUSE_OPTIONS,
  STOCK_IN_SOURCE_TYPE_OPTIONS,
  STOCK_IN_STATUS_OPTIONS,
  getStockInStatusMeta,
  getStockInSourceTypeMeta,
} from './stock-in.model';
import { StockInService } from './stock-in.service';

@Component({
  selector: 'app-stock-in-list',
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
    NzDatePickerModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    AppTableSearchInputComponent,
    AppSelectionBarComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './stock-in-list.component.html',
  styleUrls: ['./stock-in-list.component.scss'],
})
export class StockInListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;

  // Options & Metadata helpers
  readonly warehouseOptions = STOCK_IN_WAREHOUSE_OPTIONS;
  readonly sourceTypeOptions = STOCK_IN_SOURCE_TYPE_OPTIONS;
  readonly statusOptions = STOCK_IN_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly getStatusMeta = getStockInStatusMeta;
  readonly getSourceTypeMeta = getStockInSourceTypeMeta;

  // State signals
  readonly stockIns = signal<StockIn[]>([]);
  readonly allLoadedStockIns = signal<StockIn[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  // Filter params
  searchQuery = '';
  selectedWarehouseId: string | null = null;
  selectedSourceType: string | null = null;
  selectedStatus: string | null = null;
  selectedFromDate: Date | null = null;
  selectedToDate: Date | null = null;
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
  readonly selectedStockIn = signal<StockIn | null>(null);

  // Column filter (client-side lọc nhanh trên trang hiện tại)
  readonly columnFilter = new ColumnTextFilter<StockIn>(() => this.allLoadedStockIns(), {
    code: 'contains',
    warehouseName: 'contains',
    sourceType: 'equals',
    status: 'equals',
  });

  readonly statusFilterOptions = [
    { label: 'Tất cả', value: '' },
    ...STOCK_IN_STATUS_OPTIONS.filter(o => o.value !== null).map(o => ({ label: o.label, value: o.value })),
  ];

  readonly sourceFilterOptions = [
    { label: 'Tất cả', value: '' },
    ...STOCK_IN_SOURCE_TYPE_OPTIONS.filter(o => o.value !== null).map(o => ({ label: o.label, value: o.value })),
  ];

  readonly materialOptions = [
    { value: 'mat-001', label: 'NVL-SUA-TUOI - Sữa tươi', name: 'Sữa tươi', defaultPrice: 32000 },
    { value: 'mat-002', label: 'NVL-CA-PHE - Cà phê hạt Robusta Đắk Lắk', name: 'Cà phê hạt Robusta Đắk Lắk', defaultPrice: 150000 },
    { value: 'mat-003', label: 'NVL-DUONG-DEN - Đường đen Hàn Quốc', name: 'Đường đen Hàn Quốc', defaultPrice: 45000 },
    { value: 'mat-004', label: 'NVL-TRAN-CHAU - Trân châu đen cao cấp', name: 'Trân châu đen cao cấp', defaultPrice: 38000 },
    { value: 'mat-005', label: 'NVL-LY-NHUA - Ly nhựa nắp tim 500ml', name: 'Ly nhựa nắp tim 500ml', defaultPrice: 550000 },
  ];

  // Form
  readonly stockInForm = this.fb.group({
    id: [''],
    code: ['', [Validators.required, Validators.maxLength(50)]],
    warehouseId: [null as string | null, [Validators.required]],
    sourceType: ['PURCHASE', [Validators.required]],
    sourceReferenceId: [''],
    sourceReferenceCode: ['', [Validators.maxLength(50)]],
    inDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    status: ['DRAFT', [Validators.required]],
    note: ['', [Validators.maxLength(500)]],
    receivedByName: [''],
    postedAt: [''],
    items: this.fb.array([]),
  });

  get itemsArray(): FormArray {
    return this.stockInForm.get('items') as FormArray;
  }

  createItemGroup(item?: Partial<StockInItem>) {
    return this.fb.group({
      id: [item?.id || ''],
      purchaseOrderItemId: [item?.purchaseOrderItemId || ''],
      materialId: [item?.materialId || 'mat-001', [Validators.required]],
      materialName: [item?.materialName || 'Sữa tươi', [Validators.required]],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [item?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
      batchNo: [item?.batchNo || ''],
      expiryDate: [item?.expiryDate || ''],
    });
  }

  addItem(item?: Partial<StockInItem>): void {
    this.itemsArray.push(this.createItemGroup(item));
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  onMaterialSelect(index: number, matId: string): void {
    const opt = this.materialOptions.find(m => m.value === matId);
    if (opt) {
      const grp = this.itemsArray.at(index);
      grp.patchValue({
        materialName: opt.name,
        unitPrice: opt.defaultPrice,
      });
    }
  }

  getItemTotal(index: number): number {
    const val = this.itemsArray.at(index)?.value;
    return (Number(val?.quantity) || 0) * (Number(val?.unitPrice) || 0);
  }

  get grandTotal(): number {
    return this.itemsArray.controls.reduce((acc, ctrl) => {
      const val = ctrl.value;
      return acc + (Number(val?.quantity) || 0) * (Number(val?.unitPrice) || 0);
    }, 0);
  }

  private readonly stockInService = inject(StockInService);

  get modalTitle(): string {
    const mode = this.modalMode();
    if (mode === 'create') return 'Tạo phiếu nhập kho';
    if (mode === 'view') return 'Chi tiết phiếu nhập kho';
    return 'Cập nhật phiếu nhập kho';
  }

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Kho & Cung ứng', url: '/admin/inventory/stock-in/list' },
      { label: 'Nhập kho', url: '/admin/inventory/stock-in/list' },
    ]);

    this.loadData();
  }

  // ── Data loading ───────────────────────────────────────────────────
  loadData(): void {
    this.loading.set(true);
    const filter: StockInFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      warehouseId: this.selectedWarehouseId,
      sourceType: this.selectedSourceType,
      fromDate: this.selectedFromDate ? this.formatDate(this.selectedFromDate) : null,
      toDate: this.selectedToDate ? this.formatDate(this.selectedToDate) : null,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };

    this.stockInService
      .getStockInList(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.allLoadedStockIns.set(res.items);
          this.stockIns.set(this.columnFilter.hasActiveFilters ? this.columnFilter.apply() : res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.refreshCheckState();
        },
        error: () => {
          this.toastService.error('Không thể tải danh sách phiếu nhập kho.');
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
    this.selectedWarehouseId = null;
    this.selectedSourceType = null;
    this.selectedStatus = null;
    this.selectedFromDate = null;
    this.selectedToDate = null;
    this.columnFilter.reset();
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.clearSelection();
    this.loadData();
  }

  searchByField(field: keyof StockIn, value: unknown): void {
    this.stockIns.set(this.columnFilter.setField(field, value));
    this.refreshCheckState();
  }

  resetAllFieldFilter(): void {
    this.stockIns.set(this.columnFilter.reset());
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
    const list = this.stockIns();
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
    const list = this.stockIns();
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
    this.selectedStockIn.set(null);
    const dateStr = new Date().toISOString().slice(0, 10);
    const monthCode = dateStr.slice(0, 7).replace('-', '');
    this.itemsArray.clear();
    this.addItem({
      materialId: 'mat-001',
      materialName: 'Sữa tươi',
      quantity: 80,
      unitPrice: 32000,
      batchNo: 'LOT-300826-A',
      expiryDate: '2026-09-15',
    });
    this.stockInForm.reset({
      id: '',
      code: `SI-${monthCode}-${Date.now().toString().slice(-4)}`,
      warehouseId: 'wh-001',
      sourceType: 'PURCHASE',
      sourceReferenceId: 'po-001',
      sourceReferenceCode: 'PO-202608-0012',
      inDate: dateStr,
      status: 'DRAFT',
      note: '',
      receivedByName: '',
      postedAt: '',
    });
    this.stockInForm.enable();
    this.isModalVisible.set(true);
  }

  openViewModal(item: StockIn): void {
    this.modalMode.set('view');
    this.selectedStockIn.set(item);
    this.isModalVisible.set(true);
    this.stockInService
      .getStockInById(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(detail => {
        const d = detail || item;
        this.selectedStockIn.set(d);
        this.itemsArray.clear();
        (d.items || []).forEach(it => this.addItem(it));
        this.stockInForm.reset({
          id: d.id,
          code: d.code,
          warehouseId: d.warehouse?.id || d.warehouseId,
          sourceType: d.sourceType,
          sourceReferenceId: d.sourceReferenceId || '',
          sourceReferenceCode: d.sourceReferenceCode || '',
          inDate: d.inDate,
          status: d.status,
          note: d.note || '',
          receivedByName: (typeof d.receivedBy === 'object' ? d.receivedBy?.fullName : d.receivedByName) || '—',
          postedAt: d.postedAt || '',
        });
        this.stockInForm.disable();
      });
  }

  openEditModal(item: StockIn): void {
    this.modalMode.set('edit');
    this.selectedStockIn.set(item);
    this.isModalVisible.set(true);
    this.stockInService
      .getStockInById(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(detail => {
        const d = detail || item;
        this.selectedStockIn.set(d);
        this.itemsArray.clear();
        (d.items || []).forEach(it => this.addItem(it));
        if (this.itemsArray.length === 0) {
          this.addItem();
        }
        this.stockInForm.reset({
          id: d.id,
          code: d.code,
          warehouseId: d.warehouse?.id || d.warehouseId,
          sourceType: d.sourceType,
          sourceReferenceId: d.sourceReferenceId || '',
          sourceReferenceCode: d.sourceReferenceCode || '',
          inDate: d.inDate,
          status: d.status,
          note: d.note || '',
          receivedByName: (typeof d.receivedBy === 'object' ? d.receivedBy?.fullName : d.receivedByName) || '',
          postedAt: d.postedAt || '',
        });
        this.stockInForm.enable();
        this.stockInForm.get('code')?.disable();
      });
  }

  closeModal(): void {
    this.isModalVisible.set(false);
    this.stockInForm.reset();
    this.itemsArray.clear();
  }

  submitForm(): void {
    if (this.modalMode() === 'view') {
      this.closeModal();
      return;
    }

    if (!this.validateAndFocusFirstInvalid(this.stockInForm)) {
      return;
    }

    this.isSaving.set(true);
    const formRaw = this.stockInForm.getRawValue();
    const payload: Partial<StockIn> = {
      code: formRaw.code?.trim().toUpperCase(),
      warehouseId: formRaw.warehouseId || 'wh-001',
      sourceType: formRaw.sourceType || 'PURCHASE',
      sourceReferenceId: formRaw.sourceReferenceId?.trim() || '',
      sourceReferenceCode: formRaw.sourceReferenceCode?.trim() || '',
      inDate: typeof formRaw.inDate === 'string' ? formRaw.inDate : this.formatDate(formRaw.inDate as any),
      status: formRaw.status || 'DRAFT',
      note: formRaw.note?.trim() || '',
      items: formRaw.items as StockInItem[],
    };

    if (this.modalMode() === 'create') {
      this.stockInService
        .createStockIn(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success('Tạo phiếu nhập kho thành công.');
            this.isSaving.set(false);
            this.closeModal();
            this.loadData();
          },
          error: () => {
            this.toastService.error('Có lỗi xảy ra khi tạo phiếu nhập kho.');
            this.isSaving.set(false);
          },
        });
    } else {
      const id = this.selectedStockIn()?.id || formRaw.id || '';
      this.stockInService
        .updateStockIn(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success('Cập nhật phiếu nhập kho thành công.');
            this.isSaving.set(false);
            this.closeModal();
            this.loadData();
          },
          error: () => {
            this.toastService.error('Có lỗi xảy ra khi cập nhật phiếu nhập kho.');
            this.isSaving.set(false);
          },
        });
    }
  }

  // ── Delete ────────────────────────────────────────────────────────
  onDelete(item: StockIn): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa phiếu nhập kho',
      nzContent: `Bạn có chắc chắn muốn xóa phiếu nhập kho "${item.code}"?`,
      nzOkText: 'Xác nhận xóa',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        this.stockInService
          .deleteStockIn(item.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã xóa phiếu nhập kho ${item.code}.`);
              this.setOfCheckedKeys.delete(item.id);
              this.loadData();
            },
            error: () => {
              this.toastService.error('Không thể xóa phiếu nhập kho.');
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
      nzContent: `Bạn có chắc chắn muốn xóa ${selectedIds.length} phiếu nhập kho đã chọn?`,
      nzOkText: 'Xác nhận xóa',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        this.stockInService
          .batchDeleteStockIn(selectedIds)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã xóa thành công ${selectedIds.length} phiếu nhập kho.`);
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

  private formatDate(date: Date): string {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }
}
