import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';

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
import { ColumnTextFilter } from '../../../shared/utils/column-text-filter';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';

import {
  StockIn,
  StockInFilter,
  StockInItem,
  STOCK_IN_SOURCE_TYPE_OPTIONS,
  STOCK_IN_STATUS_OPTIONS,
  getStockInStatusMeta,
  getStockInSourceTypeMeta,
} from './stock-in.model';
import { StockInService } from './stock-in.service';
import { WarehouseMaterialService } from '../materials/material.service';
import { WarehouseService } from '../warehouse-list/warehouse.service';
import { Warehouse } from '../warehouse-list/warehouse.model';
import { PurchaseOrderService } from '../../procurement/purchase-orders/po.service';
import {
  PurchaseOrderDetail,
  PurchaseOrderStatus,
} from '../../procurement/purchase-orders/po.model';

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
    HasSomeAuthorityDirective,
  ],
  templateUrl: './stock-in-list.component.html',
  styleUrls: ['./stock-in-list.component.scss'],
})
export class StockInListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;

  // Options & Metadata helpers (kho dùng API thật, không hardcode wh-00x)
  readonly warehouses = signal<Warehouse[]>([]);
  get warehouseOptions(): { value: string; label: string }[] {
    return this.warehouses().map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }));
  }
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

  // NVL từ Material API thật (không còn mock mat-00x).
  readonly materialOptions = signal<{ value: string; label: string; name: string }[]>([]);

  // PO đủ điều kiện nhập (APPROVED/PARTIALLY_RECEIVED) + PO đang link.
  // Chọn PO từ dropdown là cách DUY NHẤT set được sourceReferenceId mà BE yêu cầu
  // (trước đây chỉ có ô text mã PO nên mọi phiếu PURCHASE đều rớt validate).
  readonly poOptions = signal<{ value: string; label: string; warehouseId: string; status: string }[]>([]);
  readonly selectedPo = signal<PurchaseOrderDetail | null>(null);
  readonly loadingPos = signal(false);
  readonly loadingPoDetail = signal(false);
  private poParamHandled = false;

  // Form (code/status do BE quản lý: code tự sinh, create luôn DRAFT)
  readonly stockInForm = this.fb.group({
    id: [''],
    code: [{ value: '', disabled: true }],
    warehouseId: [null as string | null, [Validators.required]],
    sourceType: ['PURCHASE', [Validators.required]],
    sourceReferenceId: [''],
    sourceReferenceCode: ['', [Validators.maxLength(50)]],
    inDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    status: [{ value: 'DRAFT', disabled: true }],
    note: ['', [Validators.maxLength(500)]],
    receivedByName: [''],
    postedAt: [''],
    items: this.fb.array([]),
  });

  get itemsArray(): FormArray {
    return this.stockInForm.get('items') as FormArray;
  }

  createItemGroup(item?: Partial<StockInItem>, maxQty?: number | null) {
    const qtyValidators = [Validators.required, Validators.min(0.01)];
    if (maxQty !== undefined && maxQty !== null && Number.isFinite(maxQty)) {
      qtyValidators.push(Validators.max(maxQty));
    }
    return this.fb.group({
      id: [item?.id || ''],
      purchaseOrderItemId: [item?.purchaseOrderItemId || ''],
      materialId: [item?.materialId || null, [Validators.required]],
      materialName: [item?.materialName || '', [Validators.required]],
      quantity: [item?.quantity ?? 1, qtyValidators],
      unitPrice: [item?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
      batchNo: [item?.batchNo || ''],
      expiryDate: [item?.expiryDate || ''],
    });
  }

  addItem(item?: Partial<StockInItem>, maxQty?: number | null): void {
    this.itemsArray.push(this.createItemGroup(item, maxQty));
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  onMaterialSelect(index: number, matId: string): void {
    const opt = this.materialOptions().find(m => m.value === matId);
    if (opt) {
      // NVL thật không có giá mặc định: chỉ điền tên, giá nhập thực tế do user nhập.
      this.itemsArray.at(index).patchValue({ materialName: opt.name });
    }
    // Đổi NVL khác với dòng PO đã link -> rớt link để BE báo rõ thay vì lệch ngầm.
    const group = this.itemsArray.at(index);
    const linkId = group.get('purchaseOrderItemId')?.value as string;
    if (linkId) {
      const line = this.selectedPo()?.items?.find(i => String(i.id) === String(linkId));
      if (!line || String(line.materialId) !== String(matId)) {
        group.patchValue({ purchaseOrderItemId: '' });
      }
    }
  }

  /** SL còn lại của dòng PO đang link ở dòng phiếu (null = dòng nhập tay). */
  remainingFor(index: number): number | null {
    const linkId = this.itemsArray.at(index)?.get('purchaseOrderItemId')?.value as string;
    if (!linkId) return null;
    const line = this.selectedPo()?.items?.find(i => String(i.id) === String(linkId));
    if (!line) return null;
    return Math.max(0, (Number(line.quantity) || 0) - (Number(line.receivedQuantity) || 0));
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
  private readonly materialService = inject(WarehouseMaterialService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly poService = inject(PurchaseOrderService);
  private readonly route = inject(ActivatedRoute);

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

    this.loadMaterialOptions();
    this.loadWarehouses();
    this.loadData();

    // Đổi kho -> nạp lại PO nhận được của kho đó + rớt link PO cũ (khác kho là BE từ chối).
    this.stockInForm
      .get('warehouseId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.clearPoLink();
        this.loadReceivablePOs(this.stockInForm.get('warehouseId')?.value as string | null);
      });

    // Rời nguồn PURCHASE -> rớt link PO (các nguồn khác không cần PO).
    this.stockInForm
      .get('sourceType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(sourceType => {
        if (sourceType !== 'PURCHASE') {
          this.clearPoLink();
        } else {
          this.loadReceivablePOs(this.stockInForm.get('warehouseId')?.value as string | null);
        }
      });

    // Vào từ nút "Nhập kho" ở chi tiết PO (?poId=...): mở form đã chọn sẵn PO.
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const poId = params['poId'] as string | undefined;
      if (poId && !this.poParamHandled) {
        this.poParamHandled = true;
        this.openCreateWithPo(poId);
      }
    });
  }

  private loadWarehouses(): void {
    this.warehouseService
      .getAllWarehouses('ACTIVE')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => this.warehouses.set(list),
        error: () => this.warehouses.set([]),
      });
  }

  // NVL từ Material API thật (chỉ ACTIVE); lỗi -> dropdown rỗng, không mock.
  private loadMaterialOptions(): void {
    this.materialService
      .getMaterials({ status: 'ACTIVE', pageIndex: 1, pageSize: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res =>
          this.materialOptions.set(
            res.items.map(m => ({ value: m.id, label: `${m.code} - ${m.name}`, name: m.name })),
          ),
        error: (err: Error) => {
          this.materialOptions.set([]);
          this.toastService.error(err.message || 'Không thể tải danh sách nguyên vật liệu.');
        },
      });
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
    this.stockInForm.reset({
      id: '',
      code: '',
      warehouseId: null,
      sourceType: 'PURCHASE',
      sourceReferenceId: '',
      sourceReferenceCode: '',
      inDate: dateStr,
      status: 'DRAFT',
      note: '',
      receivedByName: '',
      postedAt: '',
    });
    this.itemsArray.clear();
    this.addItem();
    this.stockInForm.enable();
    this.stockInForm.get('code')?.disable();
    this.stockInForm.get('status')?.disable();
    this.selectedPo.set(null);
    this.loadReceivablePOs(null);
    this.isModalVisible.set(true);
  }

  /** Mở form tạo mới đã chọn sẵn PO (từ nút "Nhập kho" ở chi tiết PO hoặc ?poId=). */
  openCreateWithPo(poId: string): void {
    this.openCreateModal();
    this.onPoSelect(poId);
  }

  /** Nạp PO đủ điều kiện nhập (APPROVED/PARTIALLY_RECEIVED), lọc theo kho nếu đã chọn. */
  private loadReceivablePOs(warehouseId?: string | null): void {
    this.loadingPos.set(true);
    const base = { pageIndex: 1, pageSize: 100, warehouseId: warehouseId ?? null };
    forkJoin([
      this.poService.getPurchaseOrders({ ...base, status: PurchaseOrderStatus.APPROVED }),
      this.poService.getPurchaseOrders({ ...base, status: PurchaseOrderStatus.PARTIALLY_RECEIVED }),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([approved, partial]) => {
          const all = [...(approved.items || []), ...(partial.items || [])];
          this.poOptions.set(
            all.map(p => ({
              value: String(p.id),
              label: `${p.code} — ${p.supplierName || ''} (${p.status === PurchaseOrderStatus.APPROVED ? 'Đã duyệt' : 'Đang nhận'})`,
              warehouseId: String(p.warehouseId || ''),
              status: String(p.status),
            })),
          );
          this.loadingPos.set(false);
        },
        error: () => {
          this.poOptions.set([]);
          this.loadingPos.set(false);
        },
      });
  }

  /** Chọn PO -> tự đổ dòng (NVL + SL còn lại + giá + link dòng PO), khỏi nhập tay. */
  onPoSelect(poId: string | null): void {
    if (!poId) {
      this.clearPoLink();
      return;
    }
    this.loadingPoDetail.set(true);
    this.poService
      .getPurchaseOrderById(poId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          this.loadingPoDetail.set(false);
          if (!detail) {
            this.toastService.error('Không tải được đơn mua hàng.');
            this.clearPoLink();
            return;
          }
          if (
            detail.status !== PurchaseOrderStatus.APPROVED &&
            detail.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
          ) {
            this.toastService.warning(`Đơn ${detail.poCode} không ở trạng thái cho phép nhập kho.`);
            this.clearPoLink();
            return;
          }
          this.applyPoDetail(detail);
        },
        error: (err: Error) => {
          this.loadingPoDetail.set(false);
          this.toastService.error(err.message || 'Không tải được đơn mua hàng.');
          this.clearPoLink();
        },
      });
  }

  private applyPoDetail(detail: PurchaseOrderDetail): void {
    // Kho ăn theo PO để khớp validate BE (khác kho là từ chối).
    if (detail.warehouseId) {
      this.stockInForm.patchValue({ warehouseId: detail.warehouseId }, { emitEvent: false });
    }
    this.stockInForm.patchValue(
      { sourceReferenceId: detail.id, sourceReferenceCode: detail.poCode },
      { emitEvent: false },
    );
    this.selectedPo.set(detail);
    if (!this.poOptions().some(o => o.value === String(detail.id))) {
      this.poOptions.update(list => [
        ...list,
        {
          value: String(detail.id),
          label: `${detail.poCode} — ${detail.supplierName || ''}`,
          warehouseId: String(detail.warehouseId || ''),
          status: String(detail.status),
        },
      ]);
    }
    this.itemsArray.clear();
    let skipped = 0;
    for (const line of detail.items || []) {
      const remaining = Math.max(0, (Number(line.quantity) || 0) - (Number(line.receivedQuantity) || 0));
      if (remaining <= 0) {
        skipped++;
        continue;
      }
      this.addItem(
        {
          purchaseOrderItemId: String(line.id ?? ''),
          materialId: line.materialId,
          materialName: line.materialName || '',
          quantity: remaining,
          unitPrice: Number(line.unitPrice) || 0,
        },
        remaining,
      );
    }
    if (skipped > 0 && this.itemsArray.length === 0) {
      this.toastService.warning(`Đơn ${detail.poCode} đã nhận đủ, không còn gì để nhập.`);
      this.clearPoLink();
    }
  }

  /** Rớt link PO (đổi kho/nguồn/PO): giữ dòng nhập tay, BE sẽ không check link nữa. */
  private clearPoLink(): void {
    this.selectedPo.set(null);
    this.stockInForm.patchValue({ sourceReferenceId: '', sourceReferenceCode: '' }, { emitEvent: false });
    this.itemsArray.controls.forEach(c => c.patchValue({ purchaseOrderItemId: '' }, { emitEvent: false }));
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
        this.itemsArray.clear();
        (d.items || []).forEach(it => this.addItem(it));
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
        this.itemsArray.clear();
        (d.items || []).forEach(it => this.addItem(it));
        if (this.itemsArray.length === 0) {
          this.addItem();
        }
        this.stockInForm.enable();
        this.stockInForm.get('code')?.disable();
        this.stockInForm.get('status')?.disable();
        // Phiếu link PO: nạp lại PO để hiện SL còn lại từng dòng (không đổ lại dòng).
        if (d.sourceType === 'PURCHASE' && d.sourceReferenceId) {
          this.poService
            .getPurchaseOrderById(d.sourceReferenceId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: detail => this.selectedPo.set(detail),
              error: () => this.selectedPo.set(null),
            });
        } else {
          this.selectedPo.set(null);
        }
      });
  }

  closeModal(): void {
    this.isModalVisible.set(false);
    this.stockInForm.reset();
    this.itemsArray.clear();
    this.selectedPo.set(null);
  }

  submitForm(): void {
    if (this.modalMode() === 'view') {
      this.closeModal();
      return;
    }

    if (!this.validateAndFocusFirstInvalid(this.stockInForm)) {
      return;
    }

    // Phiếu PURCHASE không dòng nào = thiếu link PO, BE chắc chắn từ chối.
    if (this.stockInForm.get('sourceType')?.value === 'PURCHASE' && this.itemsArray.length === 0) {
      this.toastService.warning('Phiếu nhập từ PO chưa có dòng nguyên vật liệu nào. Hãy chọn đơn mua hàng trước.');
      return;
    }
    // Dòng chưa gắn dòng PO thì BE từ chối: báo rõ ngay, khỏi chờ lỗi chung chung.
    if (this.stockInForm.get('sourceType')?.value === 'PURCHASE') {
      const missingLink = this.itemsArray.controls.some(
        c => !(c.get('purchaseOrderItemId')?.value as string),
      );
      if (missingLink) {
        this.toastService.warning('Còn dòng chưa gắn với dòng đơn mua hàng. Hãy chọn lại đơn hoặc xóa dòng đó.');
        return;
      }
    }

    this.isSaving.set(true);
    const formRaw = this.stockInForm.getRawValue();
    const payload: Partial<StockIn> = {
      warehouseId: formRaw.warehouseId as string,
      sourceType: formRaw.sourceType || 'PURCHASE',
      sourceReferenceId: formRaw.sourceReferenceId?.trim() || null,
      sourceReferenceCode: formRaw.sourceReferenceCode?.trim() || '',
      inDate: typeof formRaw.inDate === 'string' ? formRaw.inDate : this.formatDate(formRaw.inDate as any),
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
          error: (err: unknown) => {
            this.toastService.error(this.extractBeMessage(err) || 'Có lỗi xảy ra khi tạo phiếu nhập kho.');
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
          error: (err: unknown) => {
            this.toastService.error(this.extractBeMessage(err) || 'Có lỗi xảy ra khi cập nhật phiếu nhập kho.');
            this.isSaving.set(false);
          },
        });
    }
  }

  /** Lấy message thật của BE (mã lỗi INV_/PROC_) thay vì câu chung chung. */
  private extractBeMessage(err: unknown): string | null {
    const e = err as { error?: { message?: string }; message?: string };
    return e?.error?.message || e?.message || null;
  }

  // ── Post / Cancel (BE chỉ hỗ trợ PATCH /status, không có DELETE) ──
  canEdit(item: StockIn): boolean {
    return item.status === 'DRAFT';
  }

  onPost(item: StockIn): void {
    if (!this.canEdit(item)) return;
    this.modalService.confirm({
      nzTitle: 'Xác nhận ghi sổ phiếu nhập kho',
      nzContent: `Ghi sổ phiếu "${item.code}"? Tồn kho sẽ tăng và không sửa được nữa.`,
      nzOkText: 'Ghi sổ',
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        this.stockInService
          .changeStatus(item.id, 'POSTED')
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã ghi sổ phiếu ${item.code}.`);
              this.loadData();
            },
            error: () => {
              this.toastService.error('Không thể ghi sổ phiếu nhập kho.');
            },
          });
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────
  onDelete(item: StockIn): void {
    if (!this.canEdit(item)) {
      this.toastService.error('Chỉ hủy được phiếu đang ở trạng thái Nháp.');
      return;
    }
    this.modalService.confirm({
      nzTitle: 'Xác nhận hủy phiếu nhập kho',
      nzContent: `Bạn có chắc chắn muốn hủy phiếu nhập kho "${item.code}"? (BE không hỗ trợ xóa cứng)`,
      nzOkText: 'Xác nhận hủy',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        this.stockInService
          .changeStatus(item.id, 'CANCELLED')
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã hủy phiếu nhập kho ${item.code}.`);
              this.setOfCheckedKeys.delete(item.id);
              this.loadData();
            },
            error: () => {
              this.toastService.error('Không thể hủy phiếu nhập kho.');
            },
          });
      },
    });
  }

  onBatchDelete(): void {
    this.toastService.error('BE không hỗ trợ xóa/hủy hàng loạt phiếu nhập. Vui lòng hủy từng phiếu DRAFT.');
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }
}
