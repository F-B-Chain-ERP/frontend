import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
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
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
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
    HasSomeAuthorityDirective,
  ],
  templateUrl: './po-list.component.html',
  styleUrls: ['./po-list.component.scss'],
})
export class PurchaseOrderListComponent extends BaseComponent implements OnInit {
  readonly PurchaseOrderStatus = PurchaseOrderStatus;
  readonly Role = ROLE;
  readonly statusOptions = PURCHASE_ORDER_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // State signals
  readonly purchaseOrders = signal<PurchaseOrder[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly actionLoading = signal(false);

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
          this.purchaseOrders.set(res.content ?? []);
          this.total.set(res.totalElements ?? 0);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.error('Không thể tải danh sách đơn mua hàng.');
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
   * Mở trang tạo mới đơn mua hàng.
   */
  openCreateForm(): void {
    this.router.navigate(['/admin/procurement/purchase-orders/create']);
  }

  /**
   * Mở trang cập nhật đơn nháp.
   */
  openEditForm(po: PurchaseOrder): void {
    this.router.navigate(['/admin/procurement/purchase-orders/edit', po.id]);
  }

  /** Gửi duyệt: DRAFT → SUBMITTED */
  onSubmit(po: PurchaseOrder): void {
    this.runAction(`Đã gửi duyệt đơn ${po.poCode}`, () => this.purchaseOrderService.submit(po.id));
  }

  /** Phê duyệt: SUBMITTED → APPROVED */
  onApprove(po: PurchaseOrder): void {
    this.runAction(`Đã duyệt đơn ${po.poCode}`, () => this.purchaseOrderService.approve(po.id));
  }

  /** Hủy đơn (kèm lý do tùy chọn) */
  onCancel(po: PurchaseOrder): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận hủy đơn mua hàng',
      nzContent: `Bạn có chắc chắn muốn hủy đơn <strong>${po.poCode}</strong>? Hành động này không thể hoàn tác!`,
      nzOkText: 'Hủy đơn',
      nzOkDanger: true,
      nzCancelText: 'Đóng',
      nzOnOk: () => {
        this.runAction(`Đã hủy đơn ${po.poCode}`, () => this.purchaseOrderService.cancel(po.id));
      },
    });
  }

  /** Xóa đơn nháp */
  onDelete(po: PurchaseOrder): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa đơn mua hàng',
      nzContent: `Hành động này sẽ xóa vĩnh viễn đơn <strong>${po.poCode}</strong>. Không thể hoàn tác!`,
      nzOkText: 'Xóa vĩnh viễn',
      nzOkDanger: true,
      nzCancelText: 'Đóng',
      nzOnOk: () => {
        this.runAction(`Đã xóa đơn ${po.poCode}`, () => this.purchaseOrderService.deletePurchaseOrder(po.id));
      },
    });
  }

  getStatusMeta(status: PurchaseOrderStatus): ReturnType<typeof getPurchaseOrderStatusMeta> {
    return getPurchaseOrderStatusMeta(status);
  }

  private runAction(successMessage: string, action: () => Observable<unknown>): void {
    this.actionLoading.set(true);
    action()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.toastService.success(successMessage);
          this.loadData();
        },
        error: () => {
          this.actionLoading.set(false);
          this.toastService.error('Thao tác thất bại', 'Vui lòng thử lại hoặc kiểm tra quyền truy cập.');
        },
      });
  }
}
