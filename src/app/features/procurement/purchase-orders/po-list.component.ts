import { ApplicationRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormArray,
  FormBuilder,
  Validators,
  AbstractControl,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, switchMap, tap, takeUntil } from 'rxjs/operators';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import type { NzSelectItemInterface } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';

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
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { PurchaseOrderService } from './po.service';
import {
  PoOption,
  PurchaseOrder,
  PurchaseOrderDetail,
  PurchaseOrderFilter,
  PurchaseOrderItemDetail,
  PurchaseOrderItemForm,
  PurchaseOrderStatus,
  PURCHASE_ORDER_STATUS_OPTIONS,
  getPurchaseOrderStatusMeta,
} from './po.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE } from '../../../shared/constants/constant';

interface NameCodeBE {
  id: string;
  code?: string;
  name?: string;
  status?: string;
}

@Component({
  selector: 'app-purchase-order-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    NzAutocompleteModule,
    NzIconModule,
    NzTooltipModule,
    NzDatePickerModule,
    NzInputNumberModule,
    NzGridModule,
    NzDividerModule,
    NzModalModule,
    NzSpinModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    AppTableSearchInputComponent,
    AppSelectionBarComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './po-list.component.html',
  styleUrls: ['./po-list.component.scss'],
})
export class PurchaseOrderListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly PurchaseOrderStatus = PurchaseOrderStatus;
  readonly statusOptions = PURCHASE_ORDER_STATUS_OPTIONS;
  readonly pageSizeOptions: number[] = [10];

  // State signals
  readonly purchaseOrders = signal<PurchaseOrder[]>([]);
  readonly allLoadedPos = signal<PurchaseOrder[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  // Filter params
  searchQuery = '';
  selectedStatus: PurchaseOrderStatus | string | null = null;
  selectedWarehouseId: string | null = null;
  selectedFromDate: Date | null = null;
  selectedToDate: Date | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // ── Modal state (tạo / xem / sửa chung 1 modal) ─────────────────────
  readonly isModalVisible = signal(false);
  readonly modalMode = signal<'create' | 'view' | 'edit'>('create');
  readonly isSaving = signal(false);
  readonly supplierOptions = signal<PoOption[]>([]);
  readonly materialOptions = signal<PoOption[]>([]);
  readonly warehouseOptions = signal<PoOption[]>([]);
  readonly unitOptions = signal<PoOption[]>([]);

  selectedPoId: string | number | null = null;
  readonly modalDetail = signal<PurchaseOrderDetail | null>(null);

  readonly poForm = this.fb.group({
    poCode: [''],
    supplierId: [null as string | null, [Validators.required]],
    warehouseId: [null as string | null, [Validators.required]],
    orderDate: [null as Date | string | null, [Validators.required]],
    expectedDate: [null as Date | string | null],
    note: ['', [Validators.maxLength(500)]],
    items: this.fb.array([], [Validators.required, this.atLeastOneItem]),
  });

  // ── Column filter (hàng lọc theo cột, client-side trên trang hiện tại) ─
  readonly columnFilter = new ColumnTextFilter<PurchaseOrder>(() => this.allLoadedPos(), {
    code: 'contains',
    supplierName: 'contains',
    warehouseName: 'contains',
    status: 'equals',
  });

  readonly statusFilterOptions = [
    { label: 'Tất cả', value: '' },
    ...PURCHASE_ORDER_STATUS_OPTIONS.filter(o => o.value !== null).map(o => ({ label: o.label, value: o.value })),
  ];

  // ── Selection (checkbox chọn nhiều / chọn tất cả) ────────────────────
  readonly setOfCheckedKeys = new Set<string | number>();
  allChecked = false;
  indeterminate = false;

  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(ApplicationConfigService);
  private readonly appRef = inject(ApplicationRef);

  /**
   * Dữ liệu Kho & Đơn vị tính: BE chưa có API (chỉ có entity + repository).
   * Dùng danh sách tĩnh ở FE; giá trị `value` PHẢI là UUID kho/đơn vị thật trong DB
   * (lấy từ bảng `warehouse` / `unit`) để ràng buộc FK khi lưu PO không bị lỗi.
   * Khi thêm/xoá kho hoặc đơn vị ở DB, cập nhật 2 mảng dưới cho khớp.
   */
  private readonly mockWarehouses: PoOption[] = [
    { value: '0229aaa0-ee51-4f70-bf2f-cc44ae13d5db', label: 'WH001 - Kho tổng Hà Nội' },
  ];

  private readonly mockUnits: PoOption[] = [
    { value: '11111111-1111-1111-1111-111111111111', label: 'KG - Kilogram' },
    { value: '4512fda1-f6e8-40b0-8c4b-2da519f01f01', label: 'LIT - Lít' },
    { value: '539936d1-a992-429b-99d7-a77518f14caf', label: 'GOI - Gói' },
    { value: 'cebce8d8-f9a2-44eb-95d0-76f091a68431', label: 'THUNG - Thùng' },
    { value: '88005c04-99dd-470f-9b78-5981e657cb3e', label: 'HOP - Hộp' },
    { value: '37834718-706b-48d9-beab-2d0bd7ec93fb', label: 'TUI - Túi' },
    { value: 'c17c929a-e09a-4c9a-8743-06a28048c6f2', label: 'CAI - Cái' },
  ];

  get itemsArray(): FormArray {
    return this.poForm.get('items') as FormArray;
  }

  readonly lineTotals = signal<number[]>([]);

  readonly grandTotal = computed(() => this.lineTotals().reduce((sum, v) => sum + v, 0));

  private recalcTotals(): void {
    const arr = this.itemsArray.controls.map(ctrl => {
      const g = ctrl as FormGroup;
      const q = Number(g.get('quantity')?.value) || 0;
      const p = Number(g.get('unitPrice')?.value) || 0;
      return q * p;
    });
    this.lineTotals.set(arr);
    this.appRef.tick();
  }

  get modalTitle(): string {
    const mode = this.modalMode();
    if (mode === 'create') return 'Tạo đơn mua hàng';
    if (mode === 'view') return 'Chi tiết đơn mua hàng';
    return 'Cập nhật đơn mua hàng';
  }

  filterByLabel = (input: string, option: NzSelectItemInterface): boolean => {
    return String(option.nzLabel ?? '').toLowerCase().includes(input.toLowerCase());
  };

  disableToDateAfterFromDate = (current: Date): boolean => {
    if (!this.selectedFromDate) return false;
    return current < this.selectedFromDate;
  };

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Mua hàng', url: '/admin/procurement/purchase-orders/list' },
      { label: 'Đơn mua hàng', url: '/admin/procurement/purchase-orders/list' },
    ]);

    this.poForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.recalcTotals());
    this.receiveForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.recalcReceiveTotals());
    this.loadData();
  }

  // ── Data loading ───────────────────────────────────────────────────
  loadData(): void {
    this.loading.set(true);
    const filter: PurchaseOrderFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      warehouseId: this.selectedWarehouseId,
      fromDate: this.selectedFromDate ? this.toDateStr(this.selectedFromDate) : null,
      toDate: this.selectedToDate ? this.toDateStr(this.selectedToDate) : null,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };

    this.purchaseOrderService
      .getPurchaseOrders(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.allLoadedPos.set(res.items);
          this.purchaseOrders.set(this.columnFilter.hasActiveFilters ? this.columnFilter.apply() : res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.refreshCheckState();
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách đơn mua hàng.');
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
    this.selectedWarehouseId = null;
    this.selectedFromDate = null;
    this.selectedToDate = null;
    this.columnFilter.reset();
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

  // ── Column filter (hàng lọc theo cột) ───────────────────────────────
  searchByField(field: keyof PurchaseOrder, value: unknown): void {
    this.purchaseOrders.set(this.columnFilter.setField(field, value));
    this.refreshCheckState();
  }

  resetAllFieldFilter(): void {
    this.purchaseOrders.set(this.columnFilter.reset());
    this.refreshCheckState();
    this.toastService.info('Đã đặt lại bộ lọc theo cột');
  }

  // ── Selection ─────────────────────────────────────────────────────
  onCheckAll(checked: boolean): void {
    this.purchaseOrders().forEach(row => {
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
    const rows = this.purchaseOrders();
    const count = rows.length;
    const checkedCount = rows.filter(r => this.setOfCheckedKeys.has(String(r.id))).length;

    this.allChecked = count > 0 && checkedCount === count;
    this.indeterminate = checkedCount > 0 && checkedCount < count;
  }

  onBatchDelete(): void {
    const ids = Array.from(this.setOfCheckedKeys);
    if (!ids.length) return;

    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa hàng loạt',
      nzContent: `Bạn có chắc chắn muốn xóa <strong>${ids.length}</strong> đơn mua hàng đã chọn?`,
      nzOkText: 'Xóa tất cả',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.isSaving.set(true);
        forkJoin(ids.map(id => this.purchaseOrderService.deletePurchaseOrder(id)))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isSaving.set(false);
              this.toastService.success('Thành công', `Đã xóa ${ids.length} đơn mua hàng.`);
              this.clearSelection();
              this.loadData();
            },
            error: err => {
              this.isSaving.set(false);
              this.toastService.error('Lỗi', err?.message || 'Xóa hàng loạt thất bại.');
            },
          });
      },
    });
  }

  // ── Status actions ────────────────────────────────────────────────
  readonly submitTarget = signal<PurchaseOrder | null>(null);

  onSubmitPO(po: PurchaseOrder): void {
    this.submitTarget.set(po);
  }

  closeSubmitModal(): void {
    this.submitTarget.set(null);
  }

  confirmSubmit(): void {
    const po = this.submitTarget();
    if (!po) return;

    this.isSaving.set(true);
    this.purchaseOrderService
      .submit(po.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeSubmitModal();
          this.toastService.success('Thành công', `Đã trình duyệt đơn mua hàng ${po.code}`);
          this.loadData();
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể trình duyệt đơn.');
        },
      });
  }

  onApprovePO(po: PurchaseOrder): void {
    this.purchaseOrderService
      .approve(po.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Thành công', `Đã phê duyệt đơn mua hàng ${po.code}`);
          this.loadData();
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể phê duyệt đơn.'),
      });
  }

  onReceivePO(po: PurchaseOrder): void {
    this.openReceiveModal(po);
  }

  // ── Receive modal (nhập số lượng nhận thực tế) ───────────────────
  readonly receiveTarget = signal<PurchaseOrder | null>(null);
  readonly receiveItems = signal<PurchaseOrderItemDetail[]>([]);
  readonly receiveUnitPrices = signal<number[]>([]);
  readonly receiveForm: FormArray<FormGroup> = this.fb.array<FormGroup>([]);

  get receiveItemsArray(): FormArray<FormGroup> {
    return this.receiveForm;
  }

  receiveQtyControl(index: number): FormControl {
    return (this.receiveForm.at(index) as FormGroup).get('receivedQuantity') as FormControl;
  }

  receiveQuantityValue(index: number): number {
    const ctrl = this.receiveForm.at(index) as FormGroup;
    return Number(ctrl.get('quantity')?.value) || 0;
  }

  openReceiveModal(po: PurchaseOrder): void {
    this.receiveTarget.set(po);
    this.getReceiveItems(po.id);
  }

  private getReceiveItems(poId: string | number): void {
    this.purchaseOrderService
      .getPurchaseOrderById(poId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          if (!detail) {
            this.toastService.error('Lỗi', 'Không thể tải danh sách nguyên vật liệu của đơn.');
            this.closeReceiveModal();
            return;
          }
          this.receiveItems.set(detail.items ?? []);
          this.receiveUnitPrices.set((detail.items ?? []).map(it => Number(it.unitPrice) || 0));
          const controls = (detail.items ?? []).map(it => {
            const max = Number(it.quantity) || 0;
            const remaining = Math.max(0, max - (Number(it.receivedQuantity) || 0));
            return this.fb.group({
              purchaseOrderItemId: [String(it.id ?? ''), [Validators.required]],
              materialName: [it.materialName ?? ''],
              quantity: [max],
              receivedQuantity: [remaining, [Validators.required, Validators.min(0.001), Validators.max(max || Number.MAX_VALUE)]],
            });
          });
          this.receiveForm.clear();
          controls.forEach(c => this.receiveForm.push(c));
          this.recalcReceiveTotals();
        },
        error: err => {
          this.toastService.error('Lỗi', err?.message || 'Không thể tải danh sách nguyên vật liệu của đơn.');
          this.closeReceiveModal();
        },
      });
  }

  readonly receiveTotals = signal<number[]>([]);
  readonly receiveGrandTotal = computed(() => this.receiveTotals().reduce((sum, v) => sum + v, 0));

  private recalcReceiveTotals(): void {
    const prices = this.receiveUnitPrices();
    const arr = this.receiveForm.controls.map((ctrl, i) => {
      const g = ctrl as FormGroup;
      const q = Number(g.get('receivedQuantity')?.value) || 0;
      return q * (prices[i] || 0);
    });
    this.receiveTotals.set(arr);
    this.appRef.tick();
  }

  closeReceiveModal(): void {
    this.receiveTarget.set(null);
    this.receiveForm.clear();
    this.receiveItems.set([]);
    this.receiveUnitPrices.set([]);
  }

  confirmReceive(): void {
    if (!this.validateAndFocusFirstInvalid(this.receiveForm)) {
      return;
    }
    const items = this.receiveForm.controls.map(ctrl => {
      const g = ctrl as FormGroup;
      const qty = Number(g.get('receivedQuantity')?.value);
      return { purchaseOrderItemId: g.get('purchaseOrderItemId')?.value as string, receivedQuantity: qty };
    });

    const po = this.receiveTarget();
    if (!po) return;

    this.isSaving.set(true);
    this.purchaseOrderService
      .receive(po.id, items)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastService.success('Thành công', `Đã ghi nhận nhập kho cho đơn ${po.code}`);
          this.closeReceiveModal();
          this.loadData();
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err?.message || 'Không thể ghi nhận nhập kho.');
        },
      });
  }

  // ── Preview / Print state ─────────────────────────────────────
  readonly isPreviewVisible = signal(false);
  readonly previewLoading = signal(false);
  readonly previewPo = signal<PurchaseOrderDetail | null>(null);
  readonly previewError = signal<string | null>(null);

  readonly cancelTarget = signal<PurchaseOrder | null>(null);
  readonly cancelReason = signal('');

  readonly rejectTarget = signal<PurchaseOrder | null>(null);
  readonly rejectReason = signal('');

  openCancelModal(po: PurchaseOrder): void {
    this.cancelTarget.set(po);
    this.cancelReason.set('');
  }

  closeCancelModal(): void {
    this.cancelTarget.set(null);
    this.cancelReason.set('');
  }

  confirmCancel(): void {
    const po = this.cancelTarget();
    const reason = this.cancelReason().trim();
    if (!po || !reason) {
      return;
    }
    this.isSaving.set(true);
    this.purchaseOrderService
      .cancel(po.id, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastService.success('Thành công', `Đã hủy đơn mua hàng ${po.code}`);
          this.closeCancelModal();
          this.loadData();
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err?.message || 'Không thể hủy đơn.');
        },
      });
  }

  openRejectModal(po: PurchaseOrder): void {
    this.rejectTarget.set(po);
    this.rejectReason.set('');
  }

  closeRejectModal(): void {
    this.rejectTarget.set(null);
    this.rejectReason.set('');
  }

  confirmReject(): void {
    const po = this.rejectTarget();
    const reason = this.rejectReason().trim();
    if (!po || !reason) {
      return;
    }
    this.isSaving.set(true);
    this.purchaseOrderService
      .reject(po.id, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastService.success('Thành công', `Đã từ chối đơn mua hàng ${po.code}. Đơn có thể sửa và trình duyệt lại.`);
          this.closeRejectModal();
          this.loadData();
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err?.message || 'Không thể từ chối đơn.');
        },
      });
  }

  // ── Preview / Print ─────────────────────────────────────────
  openPreviewModal(po: PurchaseOrder): void {
    this.isPreviewVisible.set(true);
    this.previewLoading.set(true);
    this.previewError.set(null);
    this.previewPo.set(null);

    this.purchaseOrderService
      .getPurchaseOrderById(po.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          this.previewLoading.set(false);
          if (detail) {
            this.previewPo.set(detail);
          } else {
            this.previewError.set(`Đơn mua hàng ${po.code} không tồn tại hoặc đã bị xóa.`);
          }
        },
        error: err => {
          this.previewLoading.set(false);
          const msg = err?.error?.message || err?.message || '';
          if (msg.includes('không tồn tại') || msg.includes('not found') || err?.status === 404) {
            this.previewError.set(`Đơn mua hàng ${po.code} không tồn tại hoặc đã bị xóa.`);
          } else {
            this.previewError.set('Không thể tải dữ liệu đơn mua hàng. Vui lòng thử lại.');
          }
        },
      });
  }

  closePreviewModal(): void {
    this.isPreviewVisible.set(false);
    this.previewPo.set(null);
    this.previewError.set(null);
  }

  printPo(): void {
    const printContent = document.getElementById('po-print-area');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      this.toastService.error('Lỗi', 'Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Phiếu đặt hàng - ${this.previewPo()?.poCode || ''}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 13px; color: #000; padding: 20mm; }
          .header { text-align: center; margin-bottom: 24px; }
          .header h1 { font-size: 18px; text-transform: uppercase; margin-bottom: 4px; }
          .header .company { font-size: 14px; font-weight: bold; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
          .meta div { margin-bottom: 4px; }
          .meta strong { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; }
          th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
          td { text-align: left; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row td { font-weight: bold; background-color: #f9f9f9; }
          .note { margin: 12px 0; font-size: 12px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; }
          .signatures .sig-block { text-align: center; width: 30%; }
          .signatures .sig-block .title { font-weight: bold; margin-bottom: 50px; }
          @media print { body { padding: 10mm; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  onDeletePO(po: PurchaseOrder): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa đơn mua hàng',
      nzContent: `Hành động này sẽ xóa đơn <strong>${po.code}</strong>. Chỉ áp dụng cho đơn nháp.`,
      nzOkText: 'Xóa',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.purchaseOrderService
          .deletePurchaseOrder(po.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', `Đã xóa đơn mua hàng ${po.code}`);
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể xóa đơn.'),
          });
      },
    });
  }

  // ── Modal (tạo / xem / sửa trong cùng 1 modal) ─────────────────────
  openCreateModal(): void {
    this.modalMode.set('create');
    this.selectedPoId = null;
    this.modalDetail.set(null);
    this.resetForm();
    this.warehouseOptions.set(this.mockWarehouses);
    this.unitOptions.set(this.mockUnits);
    this.loadLookupOptions();
    this.isModalVisible.set(true);
  }

  openDetailModal(po: PurchaseOrder): void {
    this.modalMode.set('view');
    this.loadPoIntoModal(po);
  }

  private loadPoIntoModal(po: PurchaseOrder): void {
    this.selectedPoId = po.id;
    this.warehouseOptions.set(this.mockWarehouses);
    this.unitOptions.set(this.mockUnits);
    forkJoin([this.loadSuppliers(), this.loadMaterials()])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.purchaseOrderService
          .getPurchaseOrderById(po.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe(detail => {
            if (detail) {
              this.modalDetail.set(detail);
              this.patchForm(detail);
              if (this.modalMode() === 'view') {
                this.poForm.disable();
              } else {
                this.poForm.enable();
              }
            }
          });
      });
    this.isModalVisible.set(true);
  }

  enterEditMode(): void {
    this.modalMode.set('edit');
    this.poForm.enable();
  }

  closeModal(): void {
    this.isModalVisible.set(false);
    this.modalDetail.set(null);
  }

  addItem(): void {
    this.itemsArray.push(this.newItem());
    this.recalcTotals();
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
    this.itemsArray.markAsDirty();
    this.recalcTotals();
  }

  onMaterialTextInput(index: number): void {
    this.itemsArray.at(index).get('materialId')?.setValue(null);
  }

  onMatSelect(index: number, option: { nzValue?: string } | null): void {
    this.itemsArray.at(index).get('materialId')?.setValue(option?.nzValue ?? null);
  }

  submitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.poForm)) {
      return;
    }

    const raw = this.poForm.getRawValue();
    const payload = {
      poCode: raw.poCode?.trim() || undefined,
      supplierId: raw.supplierId as string,
      warehouseId: raw.warehouseId as string,
      orderDate: this.toDateStr(raw.orderDate) as string,
      expectedDate: this.toDateStr(raw.expectedDate) || undefined,
      note: raw.note?.trim() || undefined,
      items: (raw.items as PurchaseOrderItemForm[]).map(it => ({
        materialId: it.materialId as string,
        unitId: it.unitId as string,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      })),
    };

    this.isSaving.set(true);
    const req$ =
      this.modalMode() === 'edit' && this.selectedPoId != null
        ? this.purchaseOrderService.updatePurchaseOrder(this.selectedPoId, payload)
        : this.purchaseOrderService.createPurchaseOrder(payload);

    req$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.success('Thành công', this.modalMode() === 'edit' ? 'Đã cập nhật đơn mua hàng' : 'Đã tạo đơn mua hàng');
        this.closeModal();
        this.loadData();
      },
      error: err => {
        this.isSaving.set(false);
        this.toastService.error('Lỗi', err?.message || 'Không thể lưu đơn mua hàng.');
      },
    });
  }

  getStatusMeta(status: PurchaseOrderStatus | string | number): ReturnType<typeof getPurchaseOrderStatusMeta> {
    return getPurchaseOrderStatusMeta(status);
  }

  // ── Private helpers ────────────────────────────────────────────────
  private loadLookupOptions(): void {
    forkJoin([this.loadSuppliers(), this.loadMaterials()])
      .pipe(takeUntil(this.destroy$))
      .subscribe({ error: () => this.toastService.error('Lỗi', 'Không thể tải dữ liệu chọn (NCC/NVL).') });
  }

  private resetForm(): void {
    this.poForm.enable();
    this.poForm.reset({
      poCode: '',
      supplierId: null,
      warehouseId: null,
      orderDate: null,
      expectedDate: null,
      note: '',
    });
    this.itemsArray.clear();
    this.itemsArray.push(this.newItem());
    this.recalcTotals();
  }

  private patchForm(detail: PurchaseOrderDetail): void {
    this.poForm.patchValue({
      poCode: detail.poCode,
      supplierId: detail.supplierId,
      warehouseId: detail.warehouseId,
      orderDate: detail.orderDate ? new Date(detail.orderDate) : null,
      expectedDate: detail.expectedDate ? new Date(detail.expectedDate) : null,
      note: detail.note ?? '',
    });
    this.itemsArray.clear();
    (detail.items || []).forEach(it => {
      const matLabel = this.materialOptions().find(o => o.value === it.materialId)?.label ?? '';
      this.itemsArray.push(
        this.fb.group({
          materialId: [it.materialId, [Validators.required]],
          materialText: [matLabel, [Validators.required]],
          unitId: [it.unitId, [Validators.required]],
          quantity: [it.quantity, [Validators.required, Validators.min(0.001)]],
          unitPrice: [it.unitPrice, [Validators.required, Validators.min(0.001)]],
        }),
      );
    });
    if (this.itemsArray.length === 0) {
      this.itemsArray.push(this.newItem());
    }
    this.recalcTotals();
  }

  private newItem(): AbstractControl {
    return this.fb.group({
      materialId: [null as string | null, [Validators.required]],
      materialText: ['', [Validators.required]],
      unitId: [null as string | null, [Validators.required]],
      quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
      unitPrice: [null as number | null, [Validators.required, Validators.min(0.001)]],
    });
  }

  private atLeastOneItem(control: AbstractControl): Record<string, boolean> | null {
    const arr = control as FormArray;
    return arr.length > 0 ? null : { atLeastOne: true };
  }

  private loadSuppliers(): Observable<unknown> {
    return this.fetchAllPages('api/v1/proc/suppliers').pipe(
      tap(list => {
        const active = list.filter(s => s.status === 'ACTIVE');
        this.supplierOptions.set(active.map(s => ({ label: `${s.code || ''} ${s.name || ''}`.trim(), value: s.id })));
      }),
      catchError(() => {
        this.supplierOptions.set([]);
        return of(null);
      }),
    );
  }

  private loadMaterials(): Observable<unknown> {
    return this.fetchAllPages('api/v1/inv/materials').pipe(
      tap(list => {
        this.materialOptions.set(list.map(m => ({ label: `${m.code || ''} ${m.name || ''}`.trim(), value: m.id })));
      }),
      catchError(() => {
        this.materialOptions.set([]);
        return of(null);
      }),
    );
  }

  private fetchAllPages(path: string, page = 0, acc: NameCodeBE[] = []): Observable<NameCodeBE[]> {
    const url = this.appConfig.getEndpointFor(path);
    const params = new HttpParams().set('page', String(page)).set('size', '10');
    return this.http.get<{ data: { content: NameCodeBE[]; totalPages?: number } }>(url, { params }).pipe(
      switchMap(res => {
        const all = acc.concat(res?.data?.content ?? []);
        const totalPages = res?.data?.totalPages ?? 0;
        if (page + 1 < totalPages) {
          return this.fetchAllPages(path, page + 1, all);
        }
        return of(all);
      }),
    );
  }

  private toDateStr(value: string | Date | null): string | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}
