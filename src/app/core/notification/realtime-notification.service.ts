import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subject, map, tap } from 'rxjs';
import { Router } from '@angular/router';
import { AccountService } from '../auth/account.service';
import { ApplicationConfigService } from '../config/application-config.service';
import { AppNotificationService } from '../../shared/app-notification/app-notification.service';
import { ApiResponse } from '../../features/login/login.model';
import {
  AppNotification,
  OrderRealtimePayload,
  ReportSseEvent,
  SseTicketResponse,
  isReportSseEvent,
} from './notification.model';

/**
 * Quản lý thông báo thời gian thực (realtime notifications) qua Server-Sent Events (SSE)
 * kết hợp Redis Pub/Sub trên backend.
 */
@Injectable({
  providedIn: 'root',
})
export class RealtimeNotificationService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(ApplicationConfigService);
  private readonly toast = inject(AppNotificationService);
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);

  private eventSource: EventSource | null = null;
  private reconnectTimer: any = null;
  private retryAttempt = 0;
  private isExplicitDisconnect = false;
  private readonly recentlyReceivedOrderCodes = new Map<string, number>();

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.readAt).length);
  readonly isConnected = signal<boolean>(false);
  readonly isConnecting = signal<boolean>(false);

  /** Sự kiện báo cáo bất đồng bộ hoàn tất (REPORT_DONE) hoặc thất bại (REPORT_FAILED) qua SSE. */
  readonly reportEvents = new Subject<ReportSseEvent>();
  readonly orderEvents$ = new Subject<OrderRealtimePayload>();

  /**
   * Tải danh sách thông báo gần đây từ cơ sở dữ liệu (source of truth).
   */
  loadRecent(limit = 20): Observable<AppNotification[]> {
    return this.http
      .get<ApiResponse<AppNotification[]>>(
        this.appConfig.getEndpointFor(`api/v1/notifications/recent?limit=${limit}`)
      )
      .pipe(
        map(res => res.data ?? []),
        tap(items => this.mergeNotifications(items))
      );
  }

  /**
   * Khởi tạo kết nối SSE:
   * 1. Gửi request lấy single-use ticket (có xác thực JWT).
   * 2. Dùng ticket kết nối EventSource tới endpoint SSE.
   */
  connect(): void {
    if (this.eventSource || this.isConnecting()) {
      return;
    }
    this.isExplicitDisconnect = false;
    this.isConnecting.set(true);

    this.http
      .post<ApiResponse<SseTicketResponse>>(
        this.appConfig.getEndpointFor('api/v1/notifications/sse-ticket'),
        {}
      )
      .subscribe({
        next: res => {
          const ticket = res.data?.ticket;
          if (!ticket) {
            this.isConnecting.set(false);
            this.scheduleReconnect();
            return;
          }
          this.openEventSource(ticket);
        },
        error: () => {
          this.isConnecting.set(false);
          this.scheduleReconnect();
        },
      });
  }

  private openEventSource(ticket: string): void {
    const sseUrl = `${this.appConfig.getEndpointFor('api/v1/notifications/sse')}?ticket=${encodeURIComponent(ticket)}`;
    this.eventSource = new EventSource(sseUrl);

    this.eventSource.onopen = () => {
      this.isConnected.set(true);
      this.isConnecting.set(false);
      this.retryAttempt = 0;
    };

    this.eventSource.addEventListener('notification', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (isReportSseEvent(payload)) {
          // Sự kiện hoàn tất/thất bại báo cáo bất đồng bộ -> chuyển tới reportEvents
          const hasActiveListener = this.reportEvents.observed;
          this.reportEvents.next(payload);
          if (!hasActiveListener) {
            this.playNotificationSound();
            if (payload.status === 'DONE') {
              this.toast.success(
                'Báo cáo đã hoàn tất',
                `Báo cáo ${payload.reportType || ''} (${payload.fileName || 'tệp kết xuất'}) đã hoàn tất. Bạn có thể vào lịch sử báo cáo để tải về.`
              );
            } else {
              this.toast.error(
                'Xuất báo cáo thất bại',
                payload.errorMessage || 'Đã có lỗi xảy ra trong quá trình xử lý báo cáo.'
              );
            }
          }
          return;
        }

        const notif: AppNotification = payload;
        this.mergeNotifications([notif]);
        const orderCode = this.extractOrderCode(notif.actionUrl) ?? this.extractOrderCode(`${notif.title} ${notif.body}`);
        if (orderCode) {
          this.recentlyReceivedOrderCodes.set(orderCode, Date.now());
        }
        this.playNotificationSound();
        const targetUrl = this.resolveNotificationUrl(notif);
        if (targetUrl) {
          this.toast.infoAction(notif.title, notif.body, () => void this.router.navigateByUrl(targetUrl));
        } else {
          this.toast.info(notif.title, notif.body);
        }
      } catch (e) {
        console.error('Error parsing notification SSE payload', e);
      }
    });

    this.eventSource.addEventListener('order_event', (event: MessageEvent) => {
      try {
        const payload: OrderRealtimePayload = JSON.parse(event.data);
        this.orderEvents$.next(payload);
        const targetUrl = this.resolveOrderUrl(payload.orderCode);
        const receivedPersistentNotification =
          Date.now() - (this.recentlyReceivedOrderCodes.get(payload.orderCode) ?? 0) < 5000;

        // Nhân viên thường nhận broadcast theo chi nhánh nhưng không có bản ghi cá nhân.
        // Giữ item trong phiên để chuông vẫn phản ánh đúng sự kiện realtime.
        if (!receivedPersistentNotification) {
          this.mergeNotifications([this.toTransientNotification(payload, targetUrl)]);
          if (payload.eventType === 'ORDER_CREATED') {
            this.playOrderAlertSound();
            this.toast.successAction(payload.title, payload.message, () => void this.router.navigateByUrl(targetUrl));
          } else {
            this.playNotificationSound();
            this.toast.infoAction(payload.title, payload.message, () => void this.router.navigateByUrl(targetUrl));
          }
        }
      } catch (e) {
        console.error('Error parsing order_event SSE payload', e);
      }
    });

    this.eventSource.onerror = () => {
      this.disconnectInternal();
      if (!this.isExplicitDisconnect) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isExplicitDisconnect) {
      return;
    }
    // Exponential backoff: 2s, 4s, 8s, tối đa 30s
    const delay = Math.min(2000 * Math.pow(2, this.retryAttempt++), 30000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private disconnectInternal(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected.set(false);
    this.isConnecting.set(false);
  }

  /**
   * Ngắt kết nối SSE (ví dụ khi đăng xuất).
   */
  disconnect(): void {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.disconnectInternal();
    this.notifications.set([]);
    this.recentlyReceivedOrderCodes.clear();
  }

  /**
   * Đánh dấu một thông báo là đã đọc (cập nhật lạc quan signal và gọi backend).
   */
  markAsRead(id: string): void {
    const now = new Date().toISOString();
    this.notifications.update(list =>
      list.map(n => (n.id === id ? {...n, readAt: now, status: 'READ'} : n))
    );
    if (!id.startsWith('realtime-order:')) {
      this.http.patch(this.appConfig.getEndpointFor(`api/v1/notifications/${id}/read`), {}).subscribe();
    }
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc.
   */
  markAllAsRead(): void {
    const now = new Date().toISOString();
    this.notifications.update(list => list.map(n => ({ ...n, readAt: n.readAt || now, status: 'READ' })));
    this.http.patch(this.appConfig.getEndpointFor('api/v1/notifications/read-all'), {}).subscribe();
  }

  /**
   * Xóa một thông báo theo ID (cập nhật lạc quan signal và gọi backend).
   */
  deleteNotification(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
    if (!id.startsWith('realtime-order:')) {
      this.http.delete(this.appConfig.getEndpointFor(`api/v1/notifications/${id}`)).subscribe();
    }
  }

  /**
   * Xóa tất cả thông báo của người dùng.
   */
  deleteAll(): void {
    this.notifications.set([]);
    this.http.delete(this.appConfig.getEndpointFor('api/v1/notifications/all')).subscribe();
  }

  /**
   * Xóa tất cả thông báo đã đọc.
   */
  deleteRead(): void {
    this.notifications.update(list => list.filter(n => !n.readAt));
    this.http.delete(this.appConfig.getEndpointFor('api/v1/notifications/read')).subscribe();
  }

  private mergeNotifications(items: AppNotification[]): void {
    this.notifications.update(current => {
      const merged = new Map(current.map(item => [item.id, item]));
      items.forEach(item => merged.set(item.id, item));
      return [...merged.values()]
        .sort((a, b) => (b.createdAt ?? b.sentAt ?? '').localeCompare(a.createdAt ?? a.sentAt ?? ''))
        .slice(0, 50);
    });
  }

  private toTransientNotification(payload: OrderRealtimePayload, actionUrl: string): AppNotification {
    const createdAt = payload.timestamp || new Date().toISOString();
    return {
      id: `realtime-order:${payload.eventType}:${payload.orderId}:${createdAt}`,
      accountId: '',
      title: payload.title,
      body: payload.message,
      status: 'PENDING',
      sentAt: createdAt,
      createdAt,
      actionUrl,
      type: payload.eventType === 'ORDER_STATUS_CHANGED' ? `ORDER_${payload.orderStatus}` : payload.eventType,
      transient: true,
    };
  }

  private resolveNotificationUrl(notification: AppNotification): string | null {
    if (notification.actionUrl?.startsWith('/')) {
      return notification.actionUrl;
    }
    const orderCode = this.extractOrderCode(`${notification.title} ${notification.body}`);
    return orderCode ? this.resolveOrderUrl(orderCode) : null;
  }

  private resolveOrderUrl(orderCode: string): string {
    return this.accountService.account()?.principalType === 'CUSTOMER'
      ? `/store/orders?orderCode=${encodeURIComponent(orderCode)}`
      : `/admin/pos/orders/list?code=${encodeURIComponent(orderCode)}`;
  }

  private extractOrderCode(value?: string): string | null {
    return value?.match(/HD-[\w-]+/)?.[0] ?? null;
  }

  /**
   * Âm thanh thông báo nhẹ nhàng qua Web Audio API không phụ thuộc file tĩnh.
   */
  private playNotificationSound(): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        return;
      }
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext có thể bị chặn nếu user chưa tương tác với trang web, bỏ qua an toàn
    }
  }

  /**
   * Âm thanh chuông báo đơn mới 2-tone sống động (E5 -> A5) qua Web Audio API.
   */
  private playOrderAlertSound(): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      if (!AudioCtx) {
        return;
      }
      const ctx = new AudioCtx();
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };

      playTone(659.25, 0, 0.22); // E5
      playTone(880.00, 0.14, 0.35); // A5
    } catch {
      // Bỏ qua an toàn nếu chưa có tương tác người dùng
    }
  }
}
