import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { StockTransferService } from './stock-transfer.service';
import {
  CreateTransferPayload,
  StockTransfer,
  StockTransferFilter,
  TRANSFER_STATUS_OPTIONS,
  canCancelTransfer,
  canDispatchTransfer,
  canEditTransfer,
  canReceiveTransfer,
  getTransferStatusMeta,
} from './stock-transfer.model';
import { WarehouseService } from '../warehouse-list/warehouse.service';
import { Warehouse } from '../warehouse-list/warehouse.model';
import { WarehouseMaterialService } from '../materials/material.service';
import { Material } from '../materials/material.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-stock-transfer-list',
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
    NzDrawerModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './stock-transfer-list.component.html',
  styleUrls: ['./stock-transfer-list.component.scss'],
})
export class StockTransferListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly getTransferStatusMeta = getTransferStatusMeta;
  readonly canEditTransfer = canEditTransfer;
  readonly canDispatchTransfer = canDispatchTransfer;
  readonly canReceiveTransfer = canReceiveTransfer;
  readonly canCancelTransfer = canCancelTransfer;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly statusOptions = TRANSFER_STATUS_OPTIONS;

  readonly transfers = signal<StockTransfer[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  warehouses: Warehouse[] = [];
  materials: Material[] = [];

  searchQuery = '';
  selectedStatus: string | null = null;
  selectedWarehouseId: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  readonly isDrawerVisible = signal(false);
  readonly selectedTransfer = signal<StockTransfer | null>(null);

  readonly isFormModalVisible = signal(false);
  readonly modalMode = signal<'add' | 'edit'>('add');
  editingId: string | null = null;

  readonly isReceiveModalVisible = signal(false);
  readonly isCancelModalVisible = signal(false);
  cancelTarget: StockTransfer | null = null;

  readonly form = this.fb.group({
    fromWarehouseId: this.fb.control<string | null>(null, [Validators.required]),
    toWarehouseId: this.fb.control<string | null>(null, [Validators.required]),
    transferDate: this.fb.control<string | null>(null, [Validators.required]),
    note: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
    items: this.fb.array([]),
  });

  readonly receiveForm = this.fb.group({
    lines: this.fb.array([]),
  });

  readonly cancelForm = this.fb.group({
    reason: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
  });

  private readonly stockTransferService = inject(StockTransferService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly materialService = inject(WarehouseMaterialService);

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Kho & Cung ứng', url: '/admin/inventory/warehouses/list' },
      { label: 'Chuyển kho', url: '/admin/inventory/transfers/list' },
    ]);
    this.loadWarehouses();
    this.loadMaterials();
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const filter: StockTransferFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      warehouseId: this.selectedWarehouseId,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };
    this.stockTransferService
      .getTransfers(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.transfers.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải phiếu chuyển kho.');
        },
      });
  }

  onFilterChange(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = null;
    this.selectedWarehouseId = null;
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

  onViewDetail(record: StockTransfer): void {
    this.stockTransferService
      .getTransferById(record.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          this.selectedTransfer.set(detail);
          this.isDrawerVisible.set(true);
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể tải chi tiết phiếu.'),
      });
  }

  onCloseDrawer(): void {
    this.isDrawerVisible.set(false);
    this.selectedTransfer.set(null);
  }

  openCreateModal(): void {
    this.modalMode.set('add');
    this.editingId = null;
    this.form.reset({ fromWarehouseId: null, toWarehouseId: null, transferDate: this.todayStr(), note: null });
    this.itemsArray.clear();
    this.addItemLine();
    this.isFormModalVisible.set(true);
  }

  openEditModal(record: StockTransfer): void {
    this.stockTransferService
      .getTransferById(record.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          this.modalMode.set('edit');
          this.editingId = detail.id;
          this.form.reset({
            fromWarehouseId: detail.fromWarehouseId,
            toWarehouseId: detail.toWarehouseId,
            transferDate: detail.transferDate,
            note: detail.note,
          });
          this.itemsArray.clear();
          for (const item of detail.items) {
            this.itemsArray.push(
              this.fb.group({
                materialId: this.fb.control(item.materialId, [Validators.required]),
                quantity: this.fb.control(item.quantity, [Validators.required, Validators.min(0.001)]),
                unitPrice: this.fb.control(item.unitPrice ?? 0, [Validators.required, Validators.min(0)]),
              }),
            );
          }
          this.isFormModalVisible.set(true);
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể tải chi tiết phiếu.'),
      });
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
  }

  addItemLine(): void {
    this.itemsArray.push(
      this.fb.group({
        materialId: this.fb.control<string | null>(null, [Validators.required]),
        quantity: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.001)]),
        unitPrice: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
      }),
    );
  }

  removeItemLine(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  onSubmitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.form)) {
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.fromWarehouseId === raw.toWarehouseId) {
      this.toastService.error('Lỗi', 'Kho xuất và kho nhận phải khác nhau.');
      return;
    }
    const materialIds = (raw.items as { materialId: string | null }[]).map(i => i.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      this.toastService.error('Lỗi', 'Một nguyên vật liệu không được xuất hiện nhiều lần trong cùng một phiếu.');
      return;
    }
    const payload: CreateTransferPayload = {
      fromWarehouseId: raw.fromWarehouseId as string,
      toWarehouseId: raw.toWarehouseId as string,
      transferDate: raw.transferDate as string,
      note: raw.note?.trim() || null,
      items: (raw.items as { materialId: string; quantity: number | string; unitPrice: number | string }[]).map(i => ({
        materialId: i.materialId,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice ?? 0),
      })),
    };
    this.isSaving.set(true);
    const request$ =
      this.modalMode() === 'edit' && this.editingId
        ? this.stockTransferService.updateTransfer(this.editingId, payload)
        : this.stockTransferService.createTransfer(payload);
    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.success('Thành công', this.modalMode() === 'edit' ? 'Đã cập nhật phiếu chuyển kho.' : 'Đã tạo phiếu chuyển kho.');
        this.closeFormModal();
        this.loadData();
      },
      error: err => {
        this.isSaving.set(false);
        this.toastService.error('Lỗi', err.message || 'Không thể lưu phiếu chuyển kho.');
      },
    });
  }

  onDispatch(record: StockTransfer): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xuất hàng',
      nzContent: `Xuất kho <strong>${record.fromWarehouseCode ?? ''}</strong> cho phiếu <strong>${record.code}</strong>? Tồn kho nguồn sẽ bị trừ ngay.`,
      nzOkText: 'Xuất hàng',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.stockTransferService
          .dispatchTransfer(record.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', 'Đã xuất hàng, phiếu chuyển sang Đang chuyển.');
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể xuất hàng.'),
          });
      },
    });
  }

  openReceiveModal(record: StockTransfer): void {
    this.stockTransferService
      .getTransferById(record.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          this.selectedTransfer.set(detail);
          this.linesArray.clear();
          for (const item of detail.items) {
            this.linesArray.push(
              this.fb.group({
                itemId: this.fb.control(item.id),
                materialLabel: this.fb.control(`${item.materialCode ?? ''} - ${item.materialName ?? ''}`),
                remaining: this.fb.control(item.remainingQuantity),
                receivedQuantity: this.fb.control<number | null>(null, [Validators.min(0)]),
              }),
            );
          }
          this.isReceiveModalVisible.set(true);
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể tải chi tiết phiếu.'),
      });
  }

  closeReceiveModal(): void {
    this.isReceiveModalVisible.set(false);
  }

  onSubmitReceive(): void {
    const detail = this.selectedTransfer();
    if (!detail) {
      return;
    }
    const lines = this.linesArray.getRawValue() as {
      itemId: string;
      remaining: number | string;
      receivedQuantity: number | string | null;
    }[];
    const payload = lines
      .filter(l => l.receivedQuantity != null && Number(l.receivedQuantity) > 0)
      .map(l => ({ itemId: l.itemId, receivedQuantity: Number(l.receivedQuantity) }));
    if (payload.length === 0) {
      this.toastService.warning('Thông báo', 'Vui lòng nhập số lượng nhận cho ít nhất một dòng.');
      return;
    }
    for (const line of payload) {
      const remaining = lines.find(l => l.itemId === line.itemId)?.remaining ?? 0;
      if (line.receivedQuantity > Number(remaining)) {
        this.toastService.error('Lỗi', 'Số lượng nhận vượt quá số lượng còn thiếu của dòng hàng.');
        return;
      }
    }
    this.isSaving.set(true);
    this.stockTransferService
      .receiveTransfer(detail.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          this.isSaving.set(false);
          this.toastService.success(
            'Thành công',
            updated.status === 'RECEIVED' ? 'Đã nhận đủ, phiếu chuyển hoàn tất.' : 'Đã ghi nhận đợt nhận hàng.',
          );
          this.closeReceiveModal();
          this.loadData();
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể nhận hàng.');
        },
      });
  }

  openCancelModal(record: StockTransfer): void {
    this.cancelTarget = record;
    this.cancelForm.reset({ reason: null });
    this.isCancelModalVisible.set(true);
  }

  closeCancelModal(): void {
    this.isCancelModalVisible.set(false);
    this.cancelTarget = null;
  }

  onSubmitCancel(): void {
    const target = this.cancelTarget;
    if (!target) {
      return;
    }
    const reason = (this.cancelForm.get('reason')?.value as string | null)?.trim() || null;
    if (target.status === 'IN_TRANSIT' && !reason) {
      this.toastService.error('Lỗi', 'Vui lòng nhập lý do hủy khi phiếu đang đi đường.');
      return;
    }
    this.isSaving.set(true);
    this.stockTransferService
      .cancelTransfer(target.id, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastService.success('Thành công', 'Đã hủy phiếu chuyển kho.');
          this.closeCancelModal();
          this.loadData();
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể hủy phiếu.');
        },
      });
  }

  private loadWarehouses(): void {
    this.warehouseService
      .getAllWarehouses('ACTIVE')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          this.warehouses = list;
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách kho.'),
      });
  }

  private loadMaterials(): void {
    this.materialService
      .getMaterials({ status: 'ACTIVE', pageIndex: 1, pageSize: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.materials = res.items;
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách nguyên vật liệu.'),
      });
  }

  private todayStr(): string {
    const d = new Date();
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get linesArray(): FormArray {
    return this.receiveForm.get('lines') as FormArray;
  }
}
