import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzInputDirective } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzModalModule } from 'ng-zorro-antd/modal';

import { AccountService } from '../../../core/auth/account.service';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { DEFAULT_BEVERAGE_IMAGE, normalizeImageUrl } from '../../../core/util/image.util';
import { PosApiService } from '../services/pos-api.service';
import { PosOrder, PosOrderDetail, PosOrderHistoryItem, SalesBranch } from '../models/pos.model';
import { getOrderStatusMeta } from '../../pos/order.model';
import { StoreBranchService } from '../services/store-branch.service';
import { RealtimeNotificationService } from '../../../core/notification/realtime-notification.service';
import { OrderRealtimePayload } from '../../../core/notification/notification.model';

const CANCELLABLE = ['PENDING', 'CONFIRMED', 'PREPARING'];

/**
 * Màn hình Đơn hàng của tôi (My Orders) theo chuẩn e-commerce gọn gàng,
 * thân thiện với khách hàng, tối ưu responsive trên mọi thiết bị (iPhone, iPad, Desktop).
 */
@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzIconDirective,
    NzInputDirective,
    NzSpinModule,
    NzModalModule,
  ],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyOrdersComponent implements OnInit {
  readonly normalizeImageUrl = normalizeImageUrl;
  readonly fallbackImage = DEFAULT_BEVERAGE_IMAGE;
  readonly orders = signal<PosOrder[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly expandedIds = signal<Set<string>>(new Set());
  readonly details = signal<Map<string, PosOrderDetail>>(new Map());
  readonly loadingDetails = signal<Set<string>>(new Set());
  readonly histories = signal<Map<string, PosOrderHistoryItem[]>>(new Map());
  readonly actionLoading = signal(false);

  /** Tìm kiếm */
  readonly searchTerm = signal('');
  readonly copiedCode = signal<string | null>(null);

  /** Modal Hủy đơn */
  readonly cancelModalVisible = signal(false);
  readonly selectedOrderForCancel = signal<PosOrder | null>(null);
  readonly cancelReasonPreset = signal('');
  readonly cancelReasonCustom = signal('');
  readonly cancelReasons = [
    'Muốn thay đổi món hoặc mức đường / đá / topping',
    'Thay đổi địa chỉ hoặc số điện thoại nhận hàng',
    'Thời gian chờ đợi pha chế / giao hàng quá lâu',
    'Đặt nhầm đơn hàng / trùng đơn',
    'Đổi ý không muốn mua nữa',
    'Lý do khác (vui lòng ghi rõ bên dưới)',
  ];

  /** Tabs */
  readonly tabCounts = signal<Map<string, number>>(new Map());
  readonly selectedStatus = signal<string>('');

  readonly statusTabs = [
    { value: '', label: 'Tất cả', statuses: [] as string[] },
    { value: 'PENDING', label: 'Chờ xác nhận', statuses: ['PENDING'] },
    { value: 'DOING', label: 'Đang thực hiện', statuses: ['CONFIRMED', 'PREPARING', 'READY'] },
    { value: 'DELIVERING', label: 'Đang giao', statuses: ['DELIVERING'] },
    { value: 'COMPLETED', label: 'Hoàn tất', statuses: ['COMPLETED'] },
    { value: 'CANCELLED', label: 'Đã hủy', statuses: ['CANCELLED', 'REJECTED'] },
  ];

  /** Danh sách đơn hàng sau khi lọc tìm kiếm */
  readonly filteredOrders = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    let list = this.orders();

    if (term) {
      list = list.filter(o => {
        const codeMatch = (o.orderCode || '').toLowerCase().includes(term);
        const idMatch = (o.id || '').toLowerCase().includes(term);
        const detail = this.details().get(o.id);
        const itemMatch = detail?.items?.some(i => (i.productName || '').toLowerCase().includes(term)) ?? false;
        return codeMatch || idMatch || itemMatch;
      });
    }

    return list;
  });

  getStatusMeta = getOrderStatusMeta;

  private readonly api = inject(PosApiService);
  private readonly account = inject(AccountService);
  private readonly toast = inject(AppNotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly realtimeNotification = inject(RealtimeNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly branchService = inject(StoreBranchService);

  ngOnInit(): void {
    if (this.account.account()?.principalType !== 'CUSTOMER') {
      this.toast.warning('Cần đăng nhập', 'Vui lòng đăng nhập tài khoản khách hàng để xem đơn.');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/store/orders' } });
      return;
    }
    this.branchService.loadBranches().subscribe({ error: () => undefined });
    this.load();
    this.loadTabCounts();

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const orderCode = params['orderCode'];
        if (orderCode) {
          this.searchTerm.set(orderCode);
          this.selectedStatus.set('');
          // If orders are already loaded, trigger scroll and expansion
          this.highlightOrder(orderCode);
        }
      });

    this.realtimeNotification.orderEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        this.handleRealtimeOrderEvent(event);
      });
  }

  private highlightOrder(orderCode: string): void {
    const list = this.orders();
    const found = list.find(o => (o.orderCode || '').toLowerCase() === orderCode.toLowerCase());
    if (found) {
      const next = new Set(this.expandedIds());
      next.add(found.id);
      this.expandedIds.set(next);
      this.fetchDetail(found.id);
      setTimeout(() => {
        const el = document.getElementById('order-card-' + (found.orderCode || found.id));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }

  private handleRealtimeOrderEvent(event: OrderRealtimePayload): void {
    if (!event || !event.orderId) return;

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

      const currentDetail = this.details().get(event.orderId);
      if (currentDetail && event.orderStatus) {
        const nextMap = new Map(this.details());
        nextMap.set(event.orderId, { ...currentDetail, status: event.orderStatus });
        this.details.set(nextMap);
      }

      if (this.expandedIds().has(event.orderId)) {
        const currentDetails = new Map(this.details());
        currentDetails.delete(event.orderId);
        this.details.set(currentDetails);

        const currentLoading = new Set(this.loadingDetails());
        currentLoading.delete(event.orderId);
        this.loadingDetails.set(currentLoading);

        this.fetchDetail(event.orderId);
      }

      this.loadTabCounts();
    } else if (event.eventType === 'ORDER_CREATED') {
      this.load();
      this.loadTabCounts();
    }
  }

  formatPrice(amount: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  orderTypeLabel(type: string | null | undefined): string {
    return type === 'DELIVERY' ? 'Giao hàng tận nơi' : 'Nhận tại cửa hàng';
  }

  canCancel(status: string): boolean {
    return CANCELLABLE.includes((status ?? '').toUpperCase());
  }

  historyLabel(status: string | null): string {
    if (!status) return 'Đặt món';
    return getOrderStatusMeta(status).label;
  }

  paymentLabel(status: string): string {
    const s = (status ?? '').toUpperCase();
    if (s === 'PAID') return 'Đã thanh toán';
    if (s === 'REFUNDED') return 'Đã hoàn tiền';
    return 'Chưa thanh toán';
  }

  paymentMethodLabel(method: string | null | undefined): string {
    const m = (method ?? '').toUpperCase();
    if (m === 'CASH') return 'Tiền mặt tại quầy';
    if (m === 'COD') return 'Tiền mặt khi nhận hàng (COD)';
    if (m === 'VNPAY') return 'VNPAY QR';
    if (m === 'MOMO') return 'Ví MoMo';
    if (m === 'BANK_TRANSFER') return 'Chuyển khoản';
    return method || 'Tiền mặt';
  }

  getBranch(branchId: string): SalesBranch | undefined {
    return this.branchService.branches().find(b => b.id === branchId);
  }

  /**
   * Làm sạch chuỗi biến thể: tách phần size/loại ngắn gọn, tránh lặp lại tên sản phẩm.
   */
  cleanVariantName(productName: string, variantName?: string | null): string | null {
    if (!variantName) return null;
    let clean = variantName.trim();
    const parenMatch = clean.match(/\(([^)]+)\)/);
    if (parenMatch && parenMatch[1]) {
      return parenMatch[1].trim();
    }
    if (productName && clean.toLowerCase().startsWith(productName.toLowerCase())) {
      clean = clean
        .substring(productName.length)
        .trim()
        .replace(/^[-–—:(]\s*/, '')
        .replace(/\)$/, '')
        .trim();
    }
    return clean || null;
  }

  copyOrderCode(code: string, event: Event): void {
    event.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode.set(code);
      this.toast.success('Đã sao chép mã đơn', `#${code}`);
      setTimeout(() => {
        if (this.copiedCode() === code) {
          this.copiedCode.set(null);
        }
      }, 2000);
    });
  }

  load(): void {
    this.loading.set(true);
    const statuses = this.statusesForTab();
    const page = this.page();
    const append = page > 1;
    const request$ =
      statuses.length <= 1
        ? this.api.listMyOrders(page, this.pageSize, statuses[0] ?? null)
        : forkJoin(statuses.map(s => this.api.listMyOrders(page, this.pageSize, s))).pipe(
            map(results => ({
              items: results.flatMap(r => r.items).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
              total: results.reduce((sum, r) => sum + r.total, 0),
            })),
          );
    request$.subscribe({
      next: res => {
        const merged = append ? [...this.orders(), ...res.items] : res.items;
        this.orders.set(merged);
        this.total.set(res.total);
        this.loading.set(false);
        // Tải trước chi tiết cho các đơn
        merged.forEach(o => this.fetchDetail(o.id));

        const currentCode = this.route.snapshot.queryParams['orderCode'];
        if (currentCode) {
          this.highlightOrder(currentCode);
        }
      },
      error: err => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Không tải được đơn hàng');
      },
    });
  }

  loadMore(): void {
    this.page.set(this.page() + 1);
    this.load();
  }

  selectStatusTab(value: string): void {
    if (this.selectedStatus() === value) return;
    this.selectedStatus.set(value);
    this.page.set(1);
    this.load();
  }

  countForTab(value: string): number | undefined {
    return this.tabCounts().get(value);
  }

  toggleDetail(order: PosOrder): void {
    const next = new Set(this.expandedIds());
    if (next.has(order.id)) {
      next.delete(order.id);
    } else {
      next.add(order.id);
      this.fetchDetail(order.id);
    }
    this.expandedIds.set(next);
  }

  detailOf(id: string): PosOrderDetail | null {
    return this.details().get(id) ?? null;
  }

  isDetailLoading(id: string): boolean {
    return this.loadingDetails().has(id);
  }

  historyOf(id: string): PosOrderHistoryItem[] {
    return this.histories().get(id) ?? [];
  }

  openCancelModal(order: PosOrder, event: Event): void {
    event.stopPropagation();
    this.selectedOrderForCancel.set(order);
    this.cancelReasonPreset.set(this.cancelReasons[0]);
    this.cancelReasonCustom.set('');
    this.cancelModalVisible.set(true);
  }

  closeCancelModal(): void {
    this.cancelModalVisible.set(false);
    this.selectedOrderForCancel.set(null);
  }

  submitCancelModal(): void {
    const order = this.selectedOrderForCancel();
    if (!order || this.actionLoading()) return;
    const preset = this.cancelReasonPreset();
    const custom = this.cancelReasonCustom().trim();

    let reason = preset;
    if (preset.includes('khác') || custom) {
      reason = custom ? `${preset ? preset + ': ' : ''}${custom}` : preset;
    }

    if (!reason.trim()) {
      this.toast.warning('Chưa chọn lý do', 'Vui lòng chọn hoặc nhập lý do hủy đơn.');
      return;
    }

    this.actionLoading.set(true);
    this.api.cancelMyOrder(order.id, reason.trim()).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.closeCancelModal();
        this.toast.success('Hủy đơn thành công', `Đơn hàng #${order.orderCode || order.id.slice(0, 8)} đã được hủy.`);
        this.load();
        this.loadTabCounts();
        const details = new Map(this.details());
        details.delete(order.id);
        this.details.set(details);
      },
      error: err => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message || 'Hủy đơn thất bại');
      },
    });
  }

  reorder(order: PosOrder, event: Event): void {
    event.stopPropagation();
    this.toast.info('Đặt món mới', 'Đang chuyển bạn đến thực đơn UTT.CO...');
    this.router.navigate(['/store']);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (target && target.src !== this.fallbackImage) {
      target.src = this.fallbackImage;
    }
  }

  private statusesForTab(): string[] {
    return this.statusTabs.find(t => t.value === this.selectedStatus())?.statuses ?? [];
  }

  private loadTabCounts(): void {
    const all = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'REJECTED'];
    forkJoin(all.map(s => this.api.listMyOrders(1, 1, s))).subscribe({
      next: results => {
        const byStatus = new Map(all.map((s, i) => [s, results[i].total]));
        const sum = (keys: string[]): number => keys.reduce((t, k) => t + (byStatus.get(k) ?? 0), 0);
        this.tabCounts.set(
          new Map([
            ['', sum(all)],
            ['PENDING', sum(['PENDING'])],
            ['DOING', sum(['CONFIRMED', 'PREPARING', 'READY'])],
            ['DELIVERING', sum(['DELIVERING'])],
            ['COMPLETED', sum(['COMPLETED'])],
            ['CANCELLED', sum(['CANCELLED', 'REJECTED'])],
          ]),
        );
      },
      error: () => undefined,
    });
  }

  private fetchDetail(id: string): void {
    if (this.details().has(id) || this.loadingDetails().has(id)) return;
    this.loadingDetails.set(new Set(this.loadingDetails()).add(id));
    this.api.getMyOrder(id).subscribe({
      next: d => {
        const details = new Map(this.details());
        details.set(id, d);
        this.details.set(details);
        const loading = new Set(this.loadingDetails());
        loading.delete(id);
        this.loadingDetails.set(loading);
      },
      error: () => {
        const loading = new Set(this.loadingDetails());
        loading.delete(id);
        this.loadingDetails.set(loading);
      },
    });
    this.api.getMyOrderHistory(id).subscribe({
      next: list => {
        const histories = new Map(this.histories());
        histories.set(id, list);
        this.histories.set(histories);
      },
      error: () => undefined,
    });
  }
}

export default MyOrdersComponent;
