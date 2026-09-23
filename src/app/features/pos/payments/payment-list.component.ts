import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { BreadcrumbsService } from '../../../shared/app-breadcrumbs/breadcrumbs.service';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { BranchService } from '../../../core/auth/branch.service';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { PaymentApiService } from './payment-api.service';
import {
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PaymentItem,
  canCollectPayment,
  getOrderStatusMeta,
  getPaymentMethodLabel,
  getPaymentStatusMeta,
  isOnlineManualMethod,
  isTerminalOrderStatus,
} from './payment.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';

function toISODate(d: Date | null): string | null {
  if (!d) return null;
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Màn Thanh toán riêng (thay coming-soon).
 * Nguồn dữ liệu = orders lọc theo paymentStatus/paymentMethod.
 * Không đụng màn Đơn hàng. VNPay/MoMo tương lai thêm tab tại đây.
 */
@Component({
  selector: 'app-payment-list',
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
    NzTooltipModule,
    HasSomeAuthorityDirective,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
  ],
  templateUrl: './payment-list.component.html',
  styleUrls: ['./payment-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentListComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly statusOptions = PAYMENT_STATUS_OPTIONS;
  readonly methodOptions = PAYMENT_METHOD_OPTIONS;
  readonly branchService = inject(BranchService);

  readonly items = signal<PaymentItem[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageIndex = signal(DEFAULT_PAGE_INDEX);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly paymentTarget = signal<PaymentItem | null>(null);
  readonly actionLoading = signal(false);

  selectedBranchId: string | null = null;
  selectedPaymentStatus: string | null = null;
  selectedPaymentMethod: string | null = null;
  searchText = '';
  fromDate: Date | null = null;
  toDate: Date | null = null;

  getPaymentStatusMeta = getPaymentStatusMeta;
  getPaymentMethodLabel = getPaymentMethodLabel;
  getOrderStatusMeta = getOrderStatusMeta;
  canCollectPayment = canCollectPayment;
  isTerminalOrderStatus = isTerminalOrderStatus;
  isOnlineManualMethod = isOnlineManualMethod;

  private readonly api = inject(PaymentApiService);
  private readonly toast = inject(AppNotificationService);
  private readonly breadcrumbsService = inject(BreadcrumbsService);

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Bán hàng (POS)', url: '/admin/pos/payments/list' },
      { label: 'Thanh toán', url: '/admin/pos/payments/list' },
    ]);
    this.branchService.loadMine().subscribe();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api
      .listPayments({
        branchId: this.selectedBranchId,
        paymentStatus: this.selectedPaymentStatus,
        paymentMethod: this.selectedPaymentMethod,
        search: this.searchText?.trim() || null,
        fromDate: toISODate(this.fromDate),
        toDate: toISODate(this.toDate),
        pageIndex: this.pageIndex(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: res => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toast.error(err?.error?.message || 'Không tải được danh sách thanh toán');
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

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(DEFAULT_PAGE_INDEX);
    this.load();
  }

  onResetFilters(): void {
    this.selectedBranchId = null;
    this.selectedPaymentStatus = null;
    this.selectedPaymentMethod = null;
    this.searchText = '';
    this.fromDate = null;
    this.toDate = null;
    this.pageIndex.set(DEFAULT_PAGE_INDEX);
    this.load();
  }

  openPayment(item: PaymentItem): void {
    if (!canCollectPayment(item)) {
      this.toast.error(
        isTerminalOrderStatus(item.status)
          ? `Đơn ${item.orderCode} đã ${getOrderStatusMeta(item.status).label.toLowerCase()}, không thể thu tiền.`
          : 'Đơn này không thể thu tiền ở trạng thái hiện tại.',
      );
      return;
    }
    this.paymentTarget.set(item);
  }

  closePaymentModal(): void {
    if (this.actionLoading()) return;
    this.paymentTarget.set(null);
  }

  confirmPayment(): void {
    const target = this.paymentTarget();
    if (!target || this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api.confirmPaid(target.id).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.toast.success('Đã thu tiền thành công');
        this.paymentTarget.set(null);
        this.load();
      },
      error: err => {
        this.actionLoading.set(false);
        const code = err?.error?.code as string | undefined;
        const raw = (err?.error?.message as string | undefined) ?? '';
        if (code === 'ORDER_400_INVALID_STATUS_TRANSITION' || raw.includes('không được đổi thanh toán')) {
          this.toast.error('Đơn đã hoàn tất/hủy/từ chối nên không thể thu tiền. Vui lòng kiểm tra trạng thái đơn.');
        } else {
          this.toast.error(raw || 'Thu tiền thất bại');
        }
      },
    });
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
}

export default PaymentListComponent;
