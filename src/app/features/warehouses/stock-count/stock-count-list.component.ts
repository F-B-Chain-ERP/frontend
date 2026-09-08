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
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { StockCountService } from './stock-count.service';
import {
  COUNT_STATUS_OPTIONS,
  CountItemPayload,
  CreateCountPayload,
  StockCount,
  StockCountFilter,
  canDeleteCount,
  canEditCount,
  getCountStatusMeta,
} from './stock-count-real.model';
import { WarehouseService } from '../warehouse-list/warehouse.service';
import { Warehouse } from '../warehouse-list/warehouse.model';
import { WarehouseMaterialService } from '../materials/material.service';
import { Material } from '../materials/material.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-stock-count-list',
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
    NzStepsModule,
    NzTagModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './stock-count-list.component.html',
  styleUrls: ['./stock-count-list.component.scss'],
})
export class StockCountListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly getCountStatusMeta = getCountStatusMeta;
  readonly canEditCount = canEditCount;
  readonly canDeleteCount = canDeleteCount;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly statusOptions = COUNT_STATUS_OPTIONS;

  readonly counts = signal<StockCount[]>([]);
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
  readonly selectedCount = signal<StockCount | null>(null);

  readonly isFormModalVisible = signal(false);
  readonly modalMode = signal<'add' | 'edit'>('add');
  editingId: string | null = null;
  editingStatus: string | null = null;

  readonly form = this.fb.group({
    warehouseId: this.fb.control<string | null>(null, [Validators.required]),
    countDate: this.fb.control<string | null>(null, [Validators.required]),
    note: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
    items: this.fb.array([]),
  });

  private readonly stockCountService = inject(StockCountService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly materialService = inject(WarehouseMaterialService);

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Kho & Cung ứng', url: '/admin/inventory/warehouses/list' },
      { label: 'Kiểm kê kho', url: '/admin/inventory/counts/list' },
    ]);
    this.loadWarehouses();
    this.loadMaterials();
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const filter: StockCountFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      warehouseId: this.selectedWarehouseId,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };
    this.stockCountService
      .getCounts(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.counts.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải phiếu kiểm kê.');
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

  totalVariance(record: StockCount): number {
    return (record.items ?? []).reduce((sum, i) => sum + (i.varianceQuantity ?? 0), 0);
  }

  countDiscrepancy(record: StockCount): number {
    return (record.items ?? []).filter(i => Number(i.varianceQuantity ?? 0) !== 0).length;
  }

  countStepIndex(status: string): number {
    switch (status) {
      case 'DRAFT':
        return 0;
      case 'IN_PROGRESS':
        return 1;
      case 'COMPLETED':
        return 2;
      case 'ADJUSTED':
        return 3;
      default:
        return 0;
    }
  }

  onViewDetail(record: StockCount): void {
    // Mở ngay bằng dữ liệu bảng (list BE đã kèm items) để không chờ mạng,
    // đồng thời refresh nền để số liệu mới nhất.
    this.selectedCount.set(record);
    this.isDrawerVisible.set(true);
    this.stockCountService
      .getCountById(record.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          if (this.isDrawerVisible()) {
            this.selectedCount.set(detail);
          }
        },
      });
  }

  onCloseDrawer(): void {
    this.isDrawerVisible.set(false);
    this.selectedCount.set(null);
  }

  openCreateModal(): void {
    this.modalMode.set('add');
    this.editingId = null;
    this.editingStatus = null;
    this.form.reset({ warehouseId: null, countDate: this.todayStr(), note: null });
    this.form.get('warehouseId')?.enable();
    this.form.get('countDate')?.enable();
    this.itemsArray.clear();
    this.addItemLine();
    this.isFormModalVisible.set(true);
  }

  openEditModal(record: StockCount): void {
    this.stockCountService
      .getCountById(record.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          this.modalMode.set('edit');
          this.editingId = detail.id;
          this.editingStatus = detail.status;
          this.form.reset({ warehouseId: detail.warehouseId, countDate: detail.countDate, note: detail.note });
          // Kho và ngày chốt sau khi tạo, chỉ sửa số đếm (kể cả khi đang kiểm).
          this.form.get('warehouseId')?.disable();
          this.form.get('countDate')?.disable();
          this.itemsArray.clear();
          for (const item of detail.items) {
            this.itemsArray.push(
              this.fb.group({
                materialId: this.fb.control(item.materialId, [Validators.required]),
                countedQuantity: this.fb.control(item.countedQuantity, [Validators.required, Validators.min(0)]),
                note: this.fb.control(item.note),
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
        countedQuantity: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
        note: this.fb.control<string | null>(null, [Validators.maxLength(255)]),
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
    const items = (raw.items as { materialId: string | null; countedQuantity: number | string | null; note: string | null }[]).map(i => ({
      materialId: i.materialId as string,
      countedQuantity: Number(i.countedQuantity),
      note: i.note?.trim() || null,
    }));
    const materialIds = items.map(i => i.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      this.toastService.error('Lỗi', 'Một nguyên vật liệu không được xuất hiện nhiều lần trong cùng một phiếu.');
      return;
    }
    this.isSaving.set(true);
    if (this.modalMode() === 'edit' && this.editingId) {
      const payload: { note?: string | null; items?: CountItemPayload[] | null } = {
        note: raw.note?.trim() || null,
        items,
      };
      this.stockCountService
        .updateCount(this.editingId, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã cập nhật số đếm.');
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể cập nhật phiếu kiểm kê.');
          },
        });
    } else {
      const payload: CreateCountPayload = {
        warehouseId: raw.warehouseId as string,
        countDate: raw.countDate as string,
        note: raw.note?.trim() || null,
        items,
      };
      this.stockCountService
        .createCount(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã tạo phiếu kiểm kê.');
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể tạo phiếu kiểm kê.');
          },
        });
    }
  }

  onStart(record: StockCount): void {
    this.modalService.confirm({
      nzTitle: 'Bắt đầu kiểm kê',
      nzContent: `Bắt đầu kiểm phiếu <strong>${record.code}</strong>? Kho sẽ bị khóa nhập/xuất/chuyển trong lúc kiểm.`,
      nzOkText: 'Bắt đầu',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.stockCountService
          .startCount(record.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', 'Phiếu kiểm kê chuyển sang Đang kiểm.');
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể bắt đầu kiểm kê.'),
          });
      },
    });
  }

  onComplete(record: StockCount): void {
    this.modalService.confirm({
      nzTitle: 'Chốt kiểm kê',
      nzContent: `Chốt số đếm phiếu <strong>${record.code}</strong>? Hệ thống sẽ tính chênh lệch từng dòng.`,
      nzOkText: 'Chốt kiểm kê',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.stockCountService
          .completeCount(record.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', 'Đã chốt kiểm kê.');
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể chốt kiểm kê.'),
          });
      },
    });
  }

  onAdjust(record: StockCount): void {
    this.modalService.confirm({
      nzTitle: 'Điều chỉnh tồn kho',
      nzContent: `Điều chỉnh tồn theo chênh lệch phiếu <strong>${record.code}</strong>? Tồn kho sẽ tăng/giảm thật và sinh phiếu nhập/xuất điều chỉnh.`,
      nzOkText: 'Điều chỉnh tồn',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.stockCountService
          .adjustCount(record.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', 'Đã điều chỉnh tồn kho theo kiểm kê.');
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể điều chỉnh tồn.'),
          });
      },
    });
  }

  onDelete(record: StockCount): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa phiếu kiểm kê',
      nzContent: `Bạn có chắc muốn xóa phiếu <strong>${record.code}</strong>? Chỉ phiếu Nháp mới được xóa.`,
      nzOkText: 'Xóa phiếu',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.stockCountService
          .deleteCount(record.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', 'Đã xóa phiếu kiểm kê.');
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể xóa phiếu.'),
          });
      },
    });
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
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
}
