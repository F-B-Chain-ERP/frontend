import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { PurchaseOrderService } from './po.service';
import {
  PurchaseOrder,
  PurchaseOrderFilter,
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
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    NzTooltipModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
  ],
  templateUrl: './po-list.component.html',
  styleUrls: ['./po-list.component.scss'],
})
export class PurchaseOrderListComponent extends BaseComponent implements OnInit {
  readonly PurchaseOrderStatus = PurchaseOrderStatus;
  readonly statusOptions = PURCHASE_ORDER_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // State signals
  readonly purchaseOrders = signal<PurchaseOrder[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  // Filter params
  searchQuery = '';
  selectedStatus: PurchaseOrderStatus | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  private readonly purchaseOrderService = inject(PurchaseOrderService);

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

  /**
   * TODO(S2-11): thay bằng mở wizard tạo mới / sửa PO với FormArray dòng hàng
   */
  openFormPlaceholder(mode: 'create' | 'edit'): void {
    const action = mode === 'create' ? 'Tạo mới' : 'Cập nhật';
    this.toastService.info('Đang phát triển', `Chức năng ${action.toLowerCase()} đơn mua hàng sẽ được phát triển ở task S2-11.`);
  }

  /**
   * TODO(S2-11): duyệt / hủy đơn khi làm workflow
   */
  changeStatusPlaceholder(status: PurchaseOrderStatus.APPROVED | PurchaseOrderStatus.CANCELLED): void {
    const action = status === PurchaseOrderStatus.APPROVED ? 'Duyệt đơn' : 'Hủy đơn';
    this.toastService.info('Đang phát triển', `Chức năng ${action.toLowerCase()} sẽ được phát triển ở task S2-11.`);
  }

  getStatusMeta(status: PurchaseOrderStatus): ReturnType<typeof getPurchaseOrderStatusMeta> {
    return getPurchaseOrderStatusMeta(status);
  }
}
