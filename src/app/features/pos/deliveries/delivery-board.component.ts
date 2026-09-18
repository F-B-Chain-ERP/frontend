import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { BranchService } from '../../../core/auth/branch.service';
import { ROLE } from '../../../core/config/functions.constants';
import { UserService } from '../../system/users/user.service';
import { UserStatus } from '../../system/users/user.model';
import { PosStaffApiService } from '../pos-staff-api.service';
import { PosDeliveryInfo, PosOrderSummary, getDeliveryStatusMeta, getOrderStatusMeta } from '../order.model';
import { RealtimeNotificationService } from '../../../core/notification/realtime-notification.service';
import { OrderRealtimePayload } from '../../../core/notification/notification.model';

/**
 * Bảng điều giao hàng (thay placeholder coming-soon).
 * Không có API list delivery riêng nên dùng list đơn DELIVERY + cột trạng thái giao.
 * Gán shipper -> lấy hàng -> đang giao -> giao xong/thất bại (FAILED bắt buộc lý do).
 */
@Component({
  selector: 'app-pos-delivery-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzTableModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    NzModalModule,
    NzSpinModule,
    NzTooltipModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './delivery-board.component.html',
  styleUrls: ['./delivery-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosDeliveryBoardComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly branchService = inject(BranchService);
  readonly orders = signal<PosOrderSummary[]>([]);
  readonly deliveries = signal<Map<string, PosDeliveryInfo>>(new Map());
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageIndex = signal(1);
  readonly pageSize = signal(10);
  readonly assignTarget = signal<PosOrderSummary | null>(null);
  readonly shippers = signal<{ id: string; name: string }[]>([]);
  readonly failTarget = signal<PosOrderSummary | null>(null);
  readonly actionLoading = signal(false);

  selectedBranchId: string | null = null;
  selectedShipperId: string | null = null;
  failReason = '';

  getDeliveryStatusMeta = getDeliveryStatusMeta;
  getOrderStatusMeta = getOrderStatusMeta;

  private readonly api = inject(PosStaffApiService);
  private readonly users = inject(UserService);
  private readonly toast = inject(AppNotificationService);
  private readonly realtimeNotification = inject(RealtimeNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.branchService.loadMine().subscribe();
    this.load();

    this.realtimeNotification.orderEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (!event) return;
        const currentBranch = this.branchService.currentBranch()?.id;
        if (this.selectedBranchId && event.branchId && this.selectedBranchId !== event.branchId) {
          return;
        }
        if (!this.selectedBranchId && currentBranch && event.branchId && currentBranch !== event.branchId) {
          return;
        }
        this.load();
      });
  }

  formatPrice(amount: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);
  }

  deliveryOf(orderId: string): PosDeliveryInfo | null {
    return this.deliveries().get(orderId) ?? null;
  }

  load(): void {
    this.loading.set(true);
    this.api
      .listOrders({
        branchId: this.selectedBranchId,
        orderType: 'DELIVERY',
        status: null,
        fromDate: null,
        toDate: null,
        pageIndex: this.pageIndex(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: res => {
          this.orders.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
          res.items.forEach(o => this.loadDelivery(o.id));
        },
        error: err => {
          this.loading.set(false);
          this.toast.error(err?.error?.message || 'Không tải được danh sách giao hàng');
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

  openAssign(order: PosOrderSummary): void {
    this.assignTarget.set(order);
    this.selectedShipperId = null;
    this.users.getUsers({ pageIndex: 1, pageSize: 100, status: UserStatus.ACTIVE }).subscribe({
      next: res => {
        this.shippers.set((res?.items ?? []).map(u => ({ id: String(u.id), name: u.fullName || u.username })));
      },
      error: () => this.shippers.set([]),
    });
  }

  confirmAssign(): void {
    const target = this.assignTarget();
    if (!target || !this.selectedShipperId) return;
    this.actionLoading.set(true);
    this.api.assignDelivery(target.id, this.selectedShipperId).subscribe({
      next: d => {
        this.actionLoading.set(false);
        const next = new Map(this.deliveries());
        next.set(target.id, d);
        this.deliveries.set(next);
        this.assignTarget.set(null);
        this.toast.success('Phân công giao hàng thành công');
      },
      error: err => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message || 'Phân công thất bại');
      },
    });
  }

  closeAssignModal(): void {
    this.assignTarget.set(null);
  }

  advanceDelivery(order: PosOrderSummary, target: 'PICKED_UP' | 'DELIVERING' | 'DELIVERED'): void {
    this.actionLoading.set(true);
    this.api.updateDeliveryStatus(order.id, target, null, null).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.toast.success('Cập nhật giao hàng thành công');
        this.loadDelivery(order.id);
      },
      error: err => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message || 'Cập nhật thất bại');
      },
    });
  }

  openFail(order: PosOrderSummary): void {
    this.failTarget.set(order);
    this.failReason = '';
  }

  confirmFail(): void {
    const target = this.failTarget();
    if (!target || !this.failReason.trim()) return;
    this.actionLoading.set(true);
    this.api.updateDeliveryStatus(target.id, 'FAILED', this.failReason.trim(), null).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.failTarget.set(null);
        this.toast.success('Đã ghi nhận giao thất bại, đơn về READY để giao lại');
        this.loadDelivery(target.id);
      },
      error: err => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message || 'Cập nhật thất bại');
      },
    });
  }

  closeFailModal(): void {
    this.failTarget.set(null);
  }

  private loadDelivery(orderId: string): void {
    this.api.getDelivery(orderId).subscribe({
      next: d => {
        const next = new Map(this.deliveries());
        next.set(orderId, d);
        this.deliveries.set(next);
      },
      error: () => undefined,
    });
  }
}

export default PosDeliveryBoardComponent;
