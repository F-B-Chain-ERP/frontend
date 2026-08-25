import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { AccountService } from '../../../core/auth/account.service';
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
    NzPopconfirmModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './po-list.component.html',
  styleUrls: ['./po-list.component.scss'],
})
export class PurchaseOrderListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly PurchaseOrderStatus = PurchaseOrderStatus;
  readonly statusOptions = PURCHASE_ORDER_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // State signals
  readonly purchaseOrders = signal<PurchaseOrder[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  // Filter params
  searchQuery = '';
  selectedStatus: PurchaseOrderStatus | string | null = null;
  selectedWarehouseId: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  private readonly purchaseOrderService = inject(PurchaseOrderService);
  readonly accountService = inject(AccountService);

  get isGlobalAdmin(): boolean {
    return this.accountService.hasAnyAuthority(['FULL_PERMISSION', 'ROLE_ADMIN', 'ALL_SYSTEM']);
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
      warehouseId: this.selectedWarehouseId,
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

  onSubmitPO(po: PurchaseOrder): void {
    this.purchaseOrderService.submit(po.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Thành công', `Đã trình duyệt đơn mua hàng ${po.code}`);
        this.loadData();
      },
      error: err => this.toastService.error('Lỗi', err.message || 'Không thể trình duyệt đơn.'),
    });
  }

  onApprovePO(po: PurchaseOrder): void {
    this.purchaseOrderService.approve(po.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Thành công', `Đã phê duyệt đơn mua hàng ${po.code}`);
        this.loadData();
      },
      error: err => this.toastService.error('Lỗi', err.message || 'Không thể phê duyệt đơn.'),
    });
  }

  onReceivePO(po: PurchaseOrder): void {
    this.purchaseOrderService.receive(po.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Thành công', `Đã ghi nhận nhập kho cho đơn ${po.code}`);
        this.loadData();
      },
      error: err => this.toastService.error('Lỗi', err.message || 'Không thể ghi nhận nhập kho.'),
    });
  }

  onCancelPO(po: PurchaseOrder): void {
    this.purchaseOrderService.cancel(po.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Thành công', `Đã hủy đơn mua hàng ${po.code}`);
        this.loadData();
      },
      error: err => this.toastService.error('Lỗi', err.message || 'Không thể hủy đơn.'),
    });
  }

  openFormPlaceholder(mode: 'create' | 'edit' | 'view'): void {
    const action = mode === 'create' ? 'Tạo mới' : mode === 'edit' ? 'Cập nhật' : 'Xem chi tiết';
    this.toastService.info('Thông báo', `Biểu mẫu ${action.toLowerCase()} đơn mua hàng với chọn Kho chi nhánh.`);
  }

  getStatusMeta(status: PurchaseOrderStatus | string | number): ReturnType<typeof getPurchaseOrderStatusMeta> {
    return getPurchaseOrderStatusMeta(status);
  }
}
