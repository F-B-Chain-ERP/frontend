import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { BranchService } from '../../../core/auth/branch.service';
import { ROLE } from '../../../core/config/functions.constants';
import { PosStaffApiService } from '../pos-staff-api.service';
import { RealtimeNotificationService } from '../../../core/notification/realtime-notification.service';
import { OrderRealtimePayload } from '../../../core/notification/notification.model';
import {
  ORDER_STATUS_ACTION_ICONS,
  ORDER_STATUS_ACTION_LABELS,
  POS_ORDER_STATUS_OPTIONS,
  PosOrderDetail,
  PosOrderHistory,
  PosOrderSummary,
  getOrderStatusMeta,
  nextOrderActions,
  orderStepIndex,
  orderStepTitles,
} from '../order.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';

function toISODate(d: Date | null): string | null {
  if (!d) return null;
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Staff quản đơn bán (thay placeholder coming-soon).
 * Đơn tự CONFIRMED khi đủ điều kiện nên màn này chủ yếu xử lý đơn kẹt +
 * đẩy bếp (PREPARING/READY), hoàn tất, hủy/từ chối, đánh dấu thanh toán.
 */
@Component({
  selector: 'app-pos-order-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzTableModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    NzDatePickerModule,
    NzModalModule,
    NzSpinModule,
    NzStepsModule,
    NzTooltipModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosOrderListComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly statusOptions = POS_ORDER_STATUS_OPTIONS;
  readonly actionLabels = ORDER_STATUS_ACTION_LABELS;
  readonly branchService = inject(BranchService);
  readonly orders = signal<PosOrderSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageIndex = signal(DEFAULT_PAGE_INDEX);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly detailVisible = signal(false);
  readonly detailLoading = signal(false);
  readonly detail = signal<PosOrderDetail | null>(null);
  readonly history = signal<PosOrderHistory[]>([]);
  readonly actionLoading = signal(false);
  readonly cancelTarget = signal<PosOrderSummary | null>(null);
  readonly paymentTarget = signal<PosOrderSummary | null>(null);

  getStatusMeta = getOrderStatusMeta;
  nextActions = nextOrderActions;
  orderStepTitles = orderStepTitles;
  orderStepIndex = orderStepIndex;

  selectedBranchId: string | null = null;
  selectedOrderType: string | null = null;
  selectedStatus: string | null = null;
  searchText = '';
  fromDate: Date | null = null;
  toDate: Date | null = null;
  cancelReason = '';

  private readonly api = inject(PosStaffApiService);
  private readonly toast = inject(AppNotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly realtimeNotification = inject(RealtimeNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(DEFAULT_PAGE_INDEX);
    this.load();
  }

  onResetFilters(): void {
    this.selectedBranchId = null;
    this.selectedOrderType = null;
    this.selectedStatus = null;
    this.searchText = '';
    this.fromDate = null;
    this.toDate = null;
    this.pageIndex.set(DEFAULT_PAGE_INDEX);
    this.load();
  }

  actionIcon(action: string): string {
    return ORDER_STATUS_ACTION_ICONS[action]?.icon ?? 'question-circle';
  }

  actionTooltip(action: string): string {
    return ORDER_STATUS_ACTION_ICONS[action]?.tooltip ?? action;
  }

  ngOnInit(): void {
    this.branchService.loadMine().subscribe();
    this.load();

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const code = params['code'] || params['orderCode'];
        if (code) {
          this.searchText = code;
          this.selectedStatus = null;
          this.pageIndex.set(1);
          this.load(orders => {
            const found = orders.find(o => (o.orderCode || '').toLowerCase() === code.toLowerCase());
            if (found) {
              this.openDetail(found);
            }
          });
        }
      });

    this.realtimeNotification.orderEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        this.handleRealtimeOrder(event);
      });
  }

  private handleRealtimeOrder(event: OrderRealtimePayload): void {
    if (!event) return;
    const currentBranch = this.branchService.currentBranch()?.id;
    if (this.selectedBranchId && event.branchId && this.selectedBranchId !== event.branchId) {
      return;
    }
    if (!this.selectedBranchId && currentBranch && event.branchId && currentBranch !== event.branchId) {
      return;
    }

    const currentOrders = this.orders();
    const existingIndex = currentOrders.findIndex(o => o.id === event.orderId);

    if (existingIndex !== -1) {
      const updated = [...currentOrders];
      const target = { ...updated[existingIndex] };
      if (event.orderStatus) {
        target.status = event.orderStatus;
      }
      updated[existingIndex] = target;
      this.orders.set(updated);

      if (this.detailVisible() && this.detail()?.id === event.orderId) {
        this.openDetail(target);
      }
    } else {
      this.load();
    }
  }

  formatPrice(amount: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  load(onComplete?: (items: PosOrderSummary[]) => void): void {
    this.loading.set(true);
    this.api
      .listOrders({
        branchId: this.selectedBranchId,
        orderType: this.selectedOrderType,
        status: this.selectedStatus,
        fromDate: toISODate(this.fromDate),
        toDate: toISODate(this.toDate),
        search: this.searchText?.trim() || null,
        pageIndex: this.pageIndex(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: res => {
          this.orders.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);

          if (onComplete) {
            onComplete(res.items);
          } else {
            const code = this.route.snapshot.queryParams['code'] || this.route.snapshot.queryParams['orderCode'];
            if (code && !this.detailVisible()) {
              const found = res.items.find(o => (o.orderCode || '').toLowerCase() === code.toLowerCase());
              if (found) {
                this.openDetail(found);
              }
            }
          }
        },
        error: err => {
          this.loading.set(false);
          this.toast.error(err?.error?.message || 'Không tải được danh sách đơn');
        },
      });
  }

  onFilterChange(): void {
    this.pageIndex.set(1);
    this.load();
  }

  onPageChange(index: number): void {
    this.pageIndex.set(index);
    this.load();
  }

  openDetail(order: PosOrderSummary): void {
    this.detailVisible.set(true);
    this.detailLoading.set(true);
    this.detail.set(null);
    this.history.set([]);
    this.api.getOrder(order.id).subscribe({
      next: detail => {
        this.detail.set(detail);
        this.detailLoading.set(false);
      },
      error: err => {
        this.detailLoading.set(false);
        this.toast.error(err?.error?.message || 'Không tải được chi tiết đơn');
      },
    });
    this.api.getHistory(order.id).subscribe({
      next: list => this.history.set(list),
      error: () => undefined,
    });
  }

  closeDetail(): void {
    this.detailVisible.set(false);
  }

  advance(order: PosOrderSummary, target: string): void {
    if (target === 'CANCELLED') {
      this.cancelTarget.set(order);
      this.cancelReason = '';
      return;
    }
    if (target === 'COMPLETED') {
      this.doAction(this.api.completeOrder(order.id, null), 'Hoàn tất đơn thành công');
      return;
    }
    this.doAction(this.api.updateStatus(order.id, target, null), 'Cập nhật trạng thái thành công');
  }

  confirmCancel(): void {
    const target = this.cancelTarget();
    if (!target || !this.cancelReason.trim()) return;
    this.doAction(this.api.cancelOrder(target.id, this.cancelReason.trim(), null), 'Hủy đơn thành công', () => this.cancelTarget.set(null));
  }

  closeCancelModal(): void {
    this.cancelTarget.set(null);
  }

  openPayment(order: PosOrderSummary): void {
    this.paymentTarget.set(order);
  }

  openPaymentFromDetail(detail: PosOrderDetail): void {
    this.openPayment({
      id: detail.id,
      orderCode: detail.orderCode,
      branchId: detail.branchId,
      orderType: detail.orderType,
      receiverName: detail.customerName,
      totalAmount: detail.totalAmount,
      status: detail.status,
      createdAt: detail.createdAt,
    });
  }

  confirmPayment(): void {
    const target = this.paymentTarget();
    if (!target) return;
    this.doAction(this.api.updatePayment(target.id, 'PAID', null), 'Đã thu tiền thành công', () =>
      this.paymentTarget.set(null),
    );
  }

  closePaymentModal(): void {
    this.paymentTarget.set(null);
  }

  advanceFromDetail(detail: PosOrderDetail, target: string): void {
    this.advance(
      {
        id: detail.id,
        orderCode: detail.orderCode,
        branchId: detail.branchId,
        orderType: detail.orderType,
        receiverName: detail.customerName,
        totalAmount: detail.totalAmount,
        status: detail.status,
        createdAt: detail.createdAt,
      },
      target,
    );
  }

  private doAction(request: Observable<unknown>, successMessage: string, after?: () => void): void {
    this.actionLoading.set(true);
    request.subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.toast.success(successMessage);
        after?.();
        this.load();
        const current = this.detail();
        if (current) this.openDetail({ id: current.id } as PosOrderSummary);
      },
      error: err => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message || 'Thao tác thất bại');
      },
    });
  }
}

export default PosOrderListComponent;
