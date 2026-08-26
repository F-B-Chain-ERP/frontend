import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators, FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzGridModule } from 'ng-zorro-antd/grid';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { EnterAsTabContainerDirective } from '../../../shared/directives/enter-as-tab-container.directive';
import { PurchaseOrderService } from './po.service';
import {
  PurchaseOrder,
  PurchaseOrderFilter,
  PurchaseOrderFormDTO,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  PURCHASE_ORDER_STATUS_OPTIONS,
  getPurchaseOrderStatusMeta,
} from './po.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs/operators';

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
    NzIconModule,
    NzTooltipModule,
    NzDatePickerModule,
    NzInputNumberModule,
    NzGridModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    EnterAsTabContainerDirective,
  ],
  templateUrl: './po-list.component.html',
  styleUrls: ['./po-list.component.scss'],
})
export class PurchaseOrderListComponent extends BaseComponent implements OnInit {
  readonly PurchaseOrderStatus = PurchaseOrderStatus;
  readonly statusOptions = PURCHASE_ORDER_STATUS_OPTIONS;
  readonly formStatusOptions = PURCHASE_ORDER_STATUS_OPTIONS.filter(o => o.value !== null);
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // State signals
  readonly purchaseOrders = signal<PurchaseOrder[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);
  readonly isFormModalVisible = signal(false);

  // Filter params
  searchQuery = '';
  selectedStatus: PurchaseOrderStatus | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // Form (Thêm / Sửa)
  selectedPoForEdit: PurchaseOrder | null = null;
  readonly poForm = this.fb.group({
    code: this.fb.control<string>('', [this.safeTextValidator(), Validators.maxLength(50)]),
    supplierName: this.fb.control<string>('', [Validators.required, this.safeTextValidator(), Validators.maxLength(120)]),
    orderDate: this.fb.control<Date | null>(null, [Validators.required]),
    expectedDate: this.fb.control<Date | null>(null),
    status: this.fb.control<PurchaseOrderStatus>(PurchaseOrderStatus.DRAFT, [Validators.required]),
    note: this.fb.control<string>('', [Validators.maxLength(500)]),
    items: this.fb.array<FormGroup>([]),
  });

  private readonly purchaseOrderService = inject(PurchaseOrderService);

  get isEditMode(): boolean {
    return !!this.selectedPoForEdit?.id;
  }

  get formModalTitle(): string {
    return this.isEditMode ? `Cập nhật đơn: ${this.selectedPoForEdit?.code || ''}` : 'Tạo đơn mua hàng';
  }

  get itemsFormArray(): FormArray<FormGroup> {
    return this.poForm.get('items') as FormArray<FormGroup>;
  }

  get grandTotal(): number {
    return this.itemsFormArray.controls.reduce((sum, c) => {
      const v = c.getRawValue();
      return sum + (Number(v.quantity) || 0) * (Number(v.unitPrice) || 0);
    }, 0);
  }

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Mua hàng', url: '/admin/procurement/purchase-orders/list' },
      { label: 'Đơn mua hàng', url: '/admin/procurement/purchase-orders/list' },
    ]);

    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const filter: PurchaseOrderFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };

    this.purchaseOrderService
      .getPurchaseOrders(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.purchaseOrders.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
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

  openCreateModal(): void {
    this.selectedPoForEdit = null;
    this.poForm.reset({
      code: '',
      supplierName: '',
      orderDate: null,
      expectedDate: null,
      status: PurchaseOrderStatus.DRAFT,
      note: '',
    });
    this.itemsFormArray.clear();
    this.itemsFormArray.push(this.createItemRow());
    this.purchaseOrderService
      .generateNextCode()
      .pipe(takeUntil(this.destroy$))
      .subscribe(code => this.poForm.get('code')?.setValue(code));
    this.isFormModalVisible.set(true);
  }

  openEditModal(po: PurchaseOrder): void {
    this.selectedPoForEdit = { ...po, items: [...po.items] };
    this.poForm.reset({
      code: po.code,
      supplierName: po.supplierName,
      orderDate: this.toDate(po.orderDate),
      expectedDate: this.toDate(po.expectedDate),
      status: po.status,
      note: po.note ?? '',
    });
    this.itemsFormArray.clear();
    (po.items ?? []).forEach(i => this.itemsFormArray.push(this.createItemRow(i)));
    this.isFormModalVisible.set(true);
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
  }

  addItemRow(): void {
    this.itemsFormArray.push(this.createItemRow());
  }

  removeItemRow(index: number): void {
    if (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(index);
    }
  }

  lineTotal(index: number): number {
    const v = this.itemsFormArray.at(index).getRawValue();
    return (Number(v.quantity) || 0) * (Number(v.unitPrice) || 0);
  }

  onSubmitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.poForm)) {
      return;
    }
    if (this.itemsFormArray.length === 0) {
      this.toastService.error('Lỗi', 'Đơn mua hàng phải có ít nhất một mặt hàng.');
      return;
    }

    const raw = this.poForm.getRawValue();
    const items: PurchaseOrderItem[] = (raw.items ?? []).map((i: Record<string, unknown>) => ({
      id: (i['id'] as string | number) ?? '',
      materialName: typeof i['materialName'] === 'string' ? i['materialName'] : '',
      unit: typeof i['unit'] === 'string' ? i['unit'] : '',
      quantity: Number(i['quantity']) || 0,
      unitPrice: Number(i['unitPrice']) || 0,
    }));

    const dto: PurchaseOrderFormDTO = {
      code: (raw.code || '').trim(),
      supplierId: this.resolveSupplierId(raw.supplierName ?? ''),
      supplierName: (raw.supplierName || '').trim(),
      orderDate: this.toDateString(raw.orderDate),
      expectedDate: this.toDateString(raw.expectedDate),
      status: raw.status ?? PurchaseOrderStatus.DRAFT,
      items,
      note: (raw.note || '').trim(),
    };

    this.isSaving.set(true);
    const request$ =
      this.isEditMode && this.selectedPoForEdit
        ? this.purchaseOrderService.updatePurchaseOrder(this.selectedPoForEdit.id, dto)
        : this.purchaseOrderService.createPurchaseOrder(dto);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => {
        this.isSaving.set(false);
        this.toastService.success('Thành công', this.isEditMode ? `Đã cập nhật đơn ${saved.code}` : `Đã tạo đơn ${saved.code}`);
        this.closeFormModal();
        this.loadData();
      },
      error: err => {
        this.isSaving.set(false);
        this.toastService.error('Lỗi', err.message || 'Không thể lưu đơn mua hàng.');
      },
    });
  }

  onDeletePo(po: PurchaseOrder): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa đơn mua hàng',
      nzContent: `Hành động này sẽ xóa đơn <strong>${po.code}</strong> của ${po.supplierName}. Không thể hoàn tác!`,
      nzOkText: 'Xóa đơn',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.purchaseOrderService
          .deletePurchaseOrder(po.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', `Đã xóa đơn ${po.code}`);
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể xóa đơn.'),
          });
      },
    });
  }

  onApprovePo(po: PurchaseOrder): void {
    this.purchaseOrderService
      .approve(po.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: saved => {
          this.toastService.success('Thành công', `Đã duyệt đơn ${saved.code}`);
          this.loadData();
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể duyệt đơn.'),
      });
  }

  onCancelPo(po: PurchaseOrder): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận hủy đơn',
      nzContent: `Bạn có chắc chắn muốn hủy đơn <strong>${po.code}</strong>?`,
      nzOkText: 'Hủy đơn',
      nzOkDanger: true,
      nzCancelText: 'Không',
      nzOnOk: () => {
        this.purchaseOrderService
          .cancel(po.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: saved => {
              this.toastService.success('Thành công', `Đã hủy đơn ${saved.code}`);
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể hủy đơn.'),
          });
      },
    });
  }

  getStatusMeta(status: PurchaseOrderStatus): ReturnType<typeof getPurchaseOrderStatusMeta> {
    return getPurchaseOrderStatusMeta(status);
  }

  private createItemRow(item?: PurchaseOrderItem): FormGroup {
    return this.fb.group({
      id: this.fb.control<string | number>(item?.id ?? this.genTempId()),
      materialName: this.fb.control<string>(item?.materialName ?? '', [
        Validators.required,
        this.safeTextValidator(),
        Validators.maxLength(120),
      ]),
      unit: this.fb.control<string>(item?.unit ?? '', [Validators.maxLength(20)]),
      quantity: this.fb.control<number>(item?.quantity ?? 1, [Validators.required, Validators.min(1)]),
      unitPrice: this.fb.control<number>(item?.unitPrice ?? 0, [Validators.required, Validators.min(0)]),
    });
  }

  private resolveSupplierId(name: string): string | number {
    if (this.isEditMode && this.selectedPoForEdit) {
      return this.selectedPoForEdit.supplierId;
    }
    return `SUP-${Date.now()}`;
  }

  private genTempId(): string {
    return `tmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  private toDate(str?: string): Date | null {
    if (!str) {
      return null;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  private toDateString(d: Date | null): string {
    if (!d) {
      return '';
    }
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}
