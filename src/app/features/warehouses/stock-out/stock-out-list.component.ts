import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { catchError, forkJoin, map, of } from 'rxjs';

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
  StockOut,
  StockOutFilter,
  StockOutItem,
  STOCK_OUT_DESTINATION_TYPE_OPTIONS,
  STOCK_OUT_STATUS_OPTIONS,
  getStockOutStatusMeta,
  getStockOutDestinationTypeMeta,
} from './stock-out.model';
import { StockOutService } from './stock-out.service';
import { WarehouseMaterialService } from '../materials/material.service';
import { WarehouseService } from '../warehouse-list/warehouse.service';
import { Warehouse } from '../warehouse-list/warehouse.model';
import { StockBalanceService } from '../stock-balance/stock-balance.service';

@Component({
  selector: 'app-stock-out-list',
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
  templateUrl: './stock-out-list.component.html',
  styleUrls: ['./stock-out-list.component.scss'],
})
export class StockOutListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;

  // Options & Metadata helpers (kho dùng API thật)
  readonly warehouses = signal<Warehouse[]>([]);
  get warehouseOptions(): { value: string; label: string }[] {
    return this.warehouses().map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }));
  }
  readonly destinationTypeOptions = STOCK_OUT_DESTINATION_TYPE_OPTIONS;
  readonly statusOptions = STOCK_OUT_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly getStatusMeta = getStockOutStatusMeta;
  readonly getDestinationTypeMeta = getStockOutDestinationTypeMeta;

  // State signals
  readonly stockOuts = signal<StockOut[]>([]);
  readonly allLoadedStockOuts = signal<StockOut[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  // Filter params
  searchQuery = '';
  selectedWarehouseId: string | null = null;
  selectedDestinationType: string | null = null;
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
  readonly selectedStockOut = signal<StockOut | null>(null);

  // Column filter (client-side lọc nhanh trên trang hiện tại)
  readonly columnFilter = new ColumnTextFilter<StockOut>(() => this.allLoadedStockOuts(), {
    code: 'contains',
    warehouseName: 'contains',
    destinationType: 'equals',
    status: 'equals',
  });

  readonly statusFilterOptions = [
    { label: 'Tất cả', value: '' },
    ...STOCK_OUT_STATUS_OPTIONS.filter(o => o.value !== null).map(o => ({ label: o.label, value: o.value })),
  ];

  readonly destinationFilterOptions = [
    { label: 'Tất cả', value: '' },
    ...STOCK_OUT_DESTINATION_TYPE_OPTIONS.filter(o => o.value !== null).map(o => ({ label: o.label, value: o.value })),
  ];

  // NVL từ Material API thật (không còn mock mat-00x).
  // Mỗi option mang sẵn tồn khả dụng ở kho đang chọn + cờ disabled để user
  // biết ngay món nào hết tồn, khỏi chọn rồi mới báo lỗi lúc Ghi sổ.
  readonly materialOptions = signal<
    { value: string; label: string; baseLabel: string; name: string; available: number | null; disabled: boolean }[]
  >([]);

  // Tồn khả dụng theo dòng: key = materialId (theo kho đang chọn ở form)
  readonly availableMap = signal<Record<string, number | null>>({});

  // Form (code/status do BE quản lý)
  readonly stockOutForm = this.fb.group({
    id: [''],
    code: [{ value: '', disabled: true }],
    warehouseId: [null as string | null, [Validators.required]],
    destinationType: ['BRANCH_ISSUE', [Validators.required]],
    destinationReferenceId: [''],
    destinationReferenceCode: ['', [Validators.maxLength(50)]],
    outDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    status: [{ value: 'DRAFT', disabled: true }],
    note: ['', [Validators.maxLength(500)]],
    issuedByName: [''],
    postedAt: [''],
    items: this.fb.array([]),
  });

  get itemsArray(): FormArray {
    return this.stockOutForm.get('items') as FormArray;
  }

  createItemGroup(item?: Partial<StockOutItem>) {
    return this.fb.group({
      id: [item?.id || ''],
      materialId: [item?.materialId || null, [Validators.required]],
      materialName: [item?.materialName || '', [Validators.required]],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [item?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
      batchNo: [item?.batchNo || ''],
    });
  }

  addItem(item?: Partial<StockOutItem>): void {
    this.itemsArray.push(this.createItemGroup(item));
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  onMaterialSelect(index: number, matId: string): void {
    const opt = this.materialOptions().find(m => m.value === matId);
    if (opt) {
      // NVL thật không có giá mặc định: chỉ điền tên, đơn giá do user nhập.
      this.itemsArray.at(index).patchValue({ materialName: opt.name });
    }
    this.refreshAvailableFor(index);
  }

  onWarehouseChange(): void {
    this.availableMap.set({});
    // Dựng lại label gốc trước khi nạp tồn kho mới (tránh dồn suffix "(tồn:..)").
    this.materialOptions.set(this.materialOptions().map(o => ({ ...o, label: o.baseLabel, disabled: false })));
    this.refreshAllAvailabilities();
    for (let i = 0; i < this.itemsArray.length; i++) {
      this.refreshAvailableFor(i);
    }
  }

  availableFor(index: number): number | null {
    const matId = this.itemsArray.at(index)?.get('materialId')?.value as string | null;
    if (!matId) return null;
    const v = this.availableMap()[matId];
    return v ?? null;
  }

  isOverAvailable(index: number): boolean {
    const avail = this.availableFor(index);
    if (avail === null) return false;
    const qty = Number(this.itemsArray.at(index)?.get('quantity')?.value) || 0;
    return qty > avail;
  }

  refreshAvailableFor(index: number): void {
    const warehouseId = this.stockOutForm.get('warehouseId')?.value as string | null;
    const matId = this.itemsArray.at(index)?.get('materialId')?.value as string | null;
    if (!warehouseId || !matId) return;
    this.stockBalanceService.getBalance(warehouseId, matId).subscribe({
      next: b => {
        // StockBalanceService đã normalize về `availableQuantity`; giữ fallback cho response thô cũ.
        this.availableMap.update(m => ({ ...m, [matId]: this.extractAvailable(b) }));
      },
      error: () => {
        this.availableMap.update(m => ({ ...m, [matId]: null }));
      },
    });
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

  private readonly stockOutService = inject(StockOutService);
  private readonly materialService = inject(WarehouseMaterialService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly stockBalanceService = inject(StockBalanceService);

  get modalTitle(): string {
    const mode = this.modalMode();
    if (mode === 'create') return 'Tạo phiếu xuất kho';
    if (mode === 'view') return 'Chi tiết phiếu xuất kho';
    return 'Cập nhật phiếu xuất kho';
  }

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Kho & Cung ứng', url: '/admin/inventory/stock-out/list' },
      { label: 'Xuất kho', url: '/admin/inventory/stock-out/list' },
    ]);

    this.loadMaterialOptions();
    this.loadWarehouses();
    this.loadData();
    this.stockOutForm
      .get('warehouseId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onWarehouseChange());
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
        next: res => {
          this.materialOptions.set(
            res.items.map(m => ({
              value: m.id,
              label: `${m.code} - ${m.name}`,
              baseLabel: `${m.code} - ${m.name}`,
              name: m.name,
              available: null,
              disabled: false,
            })),
          );
          this.refreshAllAvailabilities();
        },
        error: (err: Error) => {
          this.materialOptions.set([]);
          this.toastService.error(err.message || 'Không thể tải danh sách nguyên vật liệu.');
        },
      });
  }

  /**
   * Nạp tồn khả dụng của TOÀN BỘ options ở kho đang chọn (1 lần khi đổi kho /
   * khi NVL vừa tải xong). NVL nào hết tồn (404 = chưa có số dư) thì disable
   * ngay trên dropdown + hiện "hết tồn" để khỏi chọn rồi mới lỗi lúc Ghi sổ.
   */
  private refreshAllAvailabilities(): void {
    const warehouseId = this.stockOutForm.get('warehouseId')?.value as string | null;
    const opts = this.materialOptions();
    if (!warehouseId || opts.length === 0) return;
    forkJoin(
      opts.map(o =>
        this.stockBalanceService.getBalance(warehouseId, o.value).pipe(
          map(b => ({ id: o.value, available: this.extractAvailable(b) })),
          // 404 = chưa có số dư ở kho này -> coi như hết tồn; lỗi khác giữ unknown.
          catchError((err: { status?: number }) =>
            of({ id: o.value, available: err?.status === 404 ? 0 : (null as number | null) })
          ),
        ),
      ),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        const availMap: Record<string, number | null> = {};
        results.forEach(r => {
          availMap[r.id] = r.available;
        });
        this.availableMap.set(availMap);
        this.materialOptions.set(
          opts.map(o => {
            const avail = availMap[o.value];
            const suffix = avail === null ? '' : avail <= 0 ? ' (hết tồn)' : ` (tồn: ${avail})`;
            return { ...o, label: `${o.baseLabel}${suffix}`, available: avail, disabled: avail === 0 };
          }),
        );
      });
  }

  private extractAvailable(b: { availableQuantity?: unknown } | null): number | null {
    if (!b) return 0;
    const raw = b as unknown as Record<string, unknown>;
    const v = Number(raw['availableQuantity'] ?? raw['quantityAvailable'] ?? raw['available'] ?? 0);
    return Number.isFinite(v) ? v : 0;
  }

  // ── Data loading ───────────────────────────────────────────────────
  loadData(): void {
    this.loading.set(true);
    const filter: StockOutFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      warehouseId: this.selectedWarehouseId,
      destinationType: this.selectedDestinationType,
      fromDate: this.selectedFromDate ? this.formatDate(this.selectedFromDate) : null,
      toDate: this.selectedToDate ? this.formatDate(this.selectedToDate) : null,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };

    this.stockOutService
      .getStockOutList(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.allLoadedStockOuts.set(res.items);
          this.stockOuts.set(this.columnFilter.hasActiveFilters ? this.columnFilter.apply() : res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.refreshCheckState();
        },
        error: () => {
          this.toastService.error('Không thể tải danh sách phiếu xuất kho.');
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
    this.selectedDestinationType = null;
    this.selectedStatus = null;
    this.selectedFromDate = null;
    this.selectedToDate = null;
    this.columnFilter.reset();
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.clearSelection();
    this.loadData();
  }

  searchByField(field: keyof StockOut, value: unknown): void {
    this.stockOuts.set(this.columnFilter.setField(field, value));
    this.refreshCheckState();
  }

  resetAllFieldFilter(): void {
    this.stockOuts.set(this.columnFilter.reset());
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
    const list = this.stockOuts();
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
    const list = this.stockOuts();
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
    this.selectedStockOut.set(null);
    const dateStr = new Date().toISOString().slice(0, 10);
    this.stockOutForm.reset({
      id: '',
      code: '',
      warehouseId: null,
      destinationType: 'BRANCH_ISSUE',
      destinationReferenceId: '',
      destinationReferenceCode: '',
      outDate: dateStr,
      status: 'DRAFT',
      note: '',
      issuedByName: '',
      postedAt: '',
    });
    this.itemsArray.clear();
    this.addItem();
    this.stockOutForm.enable();
    this.stockOutForm.get('code')?.disable();
    this.stockOutForm.get('status')?.disable();
    this.isModalVisible.set(true);
  }

  openViewModal(item: StockOut): void {
    this.modalMode.set('view');
    this.selectedStockOut.set(item);
    this.isModalVisible.set(true);
    this.stockOutService
      .getStockOutById(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(detail => {
        const d = detail || item;
        this.selectedStockOut.set(d);
        this.stockOutForm.reset({
          id: d.id,
          code: d.code,
          warehouseId: d.warehouse?.id || d.warehouseId,
          destinationType: d.destinationType,
          destinationReferenceId: d.destinationReferenceId || '',
          destinationReferenceCode: d.destinationReferenceCode || '',
          outDate: d.outDate,
          status: d.status,
          note: d.note || '',
          issuedByName: (typeof d.issuedBy === 'object' ? d.issuedBy?.fullName : d.issuedByName) || '—',
          postedAt: d.postedAt || '',
        });
        this.itemsArray.clear();
        (d.items || []).forEach(it => this.addItem(it));
        this.stockOutForm.disable();
      });
  }

  openEditModal(item: StockOut): void {
    this.modalMode.set('edit');
    this.selectedStockOut.set(item);
    this.isModalVisible.set(true);
    this.stockOutService
      .getStockOutById(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(detail => {
        const d = detail || item;
        this.selectedStockOut.set(d);
        this.stockOutForm.reset({
          id: d.id,
          code: d.code,
          warehouseId: d.warehouse?.id || d.warehouseId,
          destinationType: d.destinationType,
          destinationReferenceId: d.destinationReferenceId || '',
          destinationReferenceCode: d.destinationReferenceCode || '',
          outDate: d.outDate,
          status: d.status,
          note: d.note || '',
          issuedByName: (typeof d.issuedBy === 'object' ? d.issuedBy?.fullName : d.issuedByName) || '',
          postedAt: d.postedAt || '',
        });
        this.itemsArray.clear();
        (d.items || []).forEach(it => this.addItem(it));
        if (this.itemsArray.length === 0) {
          this.addItem();
        }
        this.stockOutForm.enable();
        this.stockOutForm.get('code')?.disable();
        this.stockOutForm.get('status')?.disable();
      });
  }

  closeModal(): void {
    this.isModalVisible.set(false);
    this.stockOutForm.reset();
    this.itemsArray.clear();
  }

  submitForm(): void {
    if (this.modalMode() === 'view') {
      this.closeModal();
      return;
    }

    if (!this.validateAndFocusFirstInvalid(this.stockOutForm)) {
      return;
    }

    this.isSaving.set(true);
    const formRaw = this.stockOutForm.getRawValue();
    const payload: Partial<StockOut> = {
      warehouseId: formRaw.warehouseId as string,
      destinationType: formRaw.destinationType || 'BRANCH_ISSUE',
      destinationReferenceId: formRaw.destinationReferenceId?.trim() || null,
      destinationReferenceCode: formRaw.destinationReferenceCode?.trim() || '',
      outDate: typeof formRaw.outDate === 'string' ? formRaw.outDate : this.formatDate(formRaw.outDate as any),
      note: formRaw.note?.trim() || '',
      items: formRaw.items as StockOutItem[],
    };

    if (this.modalMode() === 'create') {
      this.stockOutService
        .createStockOut(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success('Tạo phiếu xuất kho thành công.');
            this.isSaving.set(false);
            this.closeModal();
            this.loadData();
          },
          error: () => {
            this.toastService.error('Có lỗi xảy ra khi tạo phiếu xuất kho.');
            this.isSaving.set(false);
          },
        });
    } else {
      const id = this.selectedStockOut()?.id || formRaw.id || '';
      this.stockOutService
        .updateStockOut(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success('Cập nhật phiếu xuất kho thành công.');
            this.isSaving.set(false);
            this.closeModal();
            this.loadData();
          },
          error: () => {
            this.toastService.error('Có lỗi xảy ra khi cập nhật phiếu xuất kho.');
            this.isSaving.set(false);
          },
        });
    }
  }

  // ── Post / Cancel (BE chỉ hỗ trợ PATCH /status, không có DELETE) ──
  canEdit(item: StockOut): boolean {
    return item.status === 'DRAFT';
  }

  onPost(item: StockOut): void {
    if (!this.canEdit(item)) return;
    this.modalService.confirm({
      nzTitle: 'Xác nhận ghi sổ phiếu xuất kho',
      nzContent: `Ghi sổ phiếu "${item.code}"? Tồn kho sẽ giảm và không sửa được nữa. Nếu kho hết hàng, BE sẽ báo thiếu tồn.`,
      nzOkText: 'Ghi sổ',
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        this.stockOutService
          .changeStatus(item.id, 'POSTED')
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã ghi sổ phiếu ${item.code}.`);
              this.loadData();
            },
            error: (err: unknown) => {
              const msg =
                (err as { error?: { message?: string } })?.error?.message ||
                (err as Error)?.message ||
                'Không thể ghi sổ: kho không đủ tồn.';
              this.toastService.error(msg);
            },
          });
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────
  onDelete(item: StockOut): void {
    if (!this.canEdit(item)) {
      this.toastService.error('Chỉ hủy được phiếu đang ở trạng thái Nháp.');
      return;
    }
    this.modalService.confirm({
      nzTitle: 'Xác nhận hủy phiếu xuất kho',
      nzContent: `Bạn có chắc chắn muốn hủy phiếu xuất kho "${item.code}"? (BE không hỗ trợ xóa cứng)`,
      nzOkText: 'Xác nhận hủy',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        this.stockOutService
          .changeStatus(item.id, 'CANCELLED')
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã hủy phiếu xuất kho ${item.code}.`);
              this.setOfCheckedKeys.delete(item.id);
              this.loadData();
            },
            error: () => {
              this.toastService.error('Không thể hủy phiếu xuất kho.');
            },
          });
      },
    });
  }

  onBatchDelete(): void {
    this.toastService.error('BE không hỗ trợ xóa/hủy hàng loạt phiếu xuất. Vui lòng hủy từng phiếu DRAFT.');
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }
}
