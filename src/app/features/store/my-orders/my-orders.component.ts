import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzInputDirective } from 'ng-zorro-antd/input';
// import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { AccountService } from '../../../core/auth/account.service';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { DEFAULT_BEVERAGE_IMAGE, normalizeImageUrl } from '../../../core/util/image.util';
import { PosApiService, PosOrder, PosOrderDetail, PosOrderHistoryItem } from '../services/pos-api.service';
import { getOrderStatusMeta, orderStepIndex, orderStepTitles } from '../../pos/order.model';

const CANCELLABLE = ['PENDING', 'CONFIRMED', 'PREPARING'];

/**
 * Khách theo dõi đơn của mình (trước đây đặt xong chỉ thấy mã đơn, không có chỗ xem).
 * BE tự lọc theo CUSTOMER login; hủy chỉ khi đơn còn PENDING/CONFIRMED/PREPARING.
 */
@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NzIconDirective, NzInputDirective, NzSpinModule, AppButtonComponent],
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
  readonly cancellingId = signal<string | null>(null);
  readonly actionLoading = signal(false);
  /** Tổng số đơn mỗi tab (kiểu Shopee: Tên (n)), refresh cùng danh sách. */
  readonly tabCounts = signal<Map<string, number>>(new Map());
  readonly selectedStatus = signal<string>('');

  /** Tabs gộp theo góc nhìn khách (trọng tâm, không dàn 9 trạng thái kỹ thuật). */
  readonly statusTabs = [
    { value: '', label: 'Tất cả', statuses: [] as string[] },
    { value: 'PENDING', label: 'Chờ xác nhận', statuses: ['PENDING'] },
    { value: 'DOING', label: 'Đang thực hiện', statuses: ['CONFIRMED', 'PREPARING', 'READY'] },
    { value: 'DELIVERING', label: 'Đang giao', statuses: ['DELIVERING'] },
    { value: 'COMPLETED', label: 'Hoàn tất', statuses: ['COMPLETED'] },
    { value: 'CANCELLED', label: 'Đã hủy', statuses: ['CANCELLED', 'REJECTED'] },
  ];

  cancelReason = '';

  getStatusMeta = getOrderStatusMeta;
  orderStepTitles = orderStepTitles;
  orderStepIndex = orderStepIndex;

  private readonly api = inject(PosApiService);
  private readonly account = inject(AccountService);
  private readonly toast = inject(AppNotificationService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (this.account.account()?.principalType !== 'CUSTOMER') {
      this.toast.warning('Cần đăng nhập', 'Vui lòng đăng nhập tài khoản khách hàng để xem đơn.');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/store/orders' } });
      return;
    }
    this.load();
    this.loadTabCounts();
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

  canCancel(status: string): boolean {
    return CANCELLABLE.includes((status ?? '').toUpperCase());
  }

  /** Lịch sử gọn cho khách: label thân thiện, ẩn mã kỹ thuật (null = lúc tạo đơn). */
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
        // Kiểu Shopee: mở trang là thấy hết món, không bấm từng đơn.
        this.expandedIds.set(new Set(merged.map(o => o.id)));
        merged.forEach(o => this.fetchDetail(o.id));
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

  /** Đếm số đơn mỗi tab song song (size=1 chỉ lấy total, nhẹ như Shopee load badge). */
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

  confirmCancel(): void {
    const id = this.cancellingId();
    if (!id || !this.cancelReason.trim() || this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api.cancelMyOrder(id, this.cancelReason.trim()).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.cancellingId.set(null);
        this.toast.success('Hủy đơn thành công');
        this.load();
        this.loadTabCounts();
        const details = new Map(this.details());
        details.delete(id);
        this.details.set(details);
      },
      error: err => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message || 'Hủy đơn thất bại');
      },
    });
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (target && target.src !== this.fallbackImage) {
      target.src = this.fallbackImage;
    }
  }

  askCancel(order: PosOrder, event: Event): void {
    event.stopPropagation();
    this.cancellingId.set(order.id);
    this.cancelReason = '';
  }

  closeCancel(): void {
    this.cancellingId.set(null);
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
      error: err => {
        const loading = new Set(this.loadingDetails());
        loading.delete(id);
        this.loadingDetails.set(loading);
        this.toast.error(err?.error?.message || 'Không tải được chi tiết đơn');
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
