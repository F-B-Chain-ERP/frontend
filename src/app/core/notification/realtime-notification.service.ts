import {HttpClient} from '@angular/common/http';
import {Injectable, computed, inject, signal} from '@angular/core';
import {Observable, map, tap} from 'rxjs';
import {ApplicationConfigService} from '../config/application-config.service';
import {AppNotificationService} from '../../shared/app-notification/app-notification.service';
import {ApiResponse} from '../../features/login/login.model';
import {AppNotification, SseTicketResponse} from './notification.model';

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

  private eventSource: EventSource | null = null;
  private reconnectTimer: any = null;
  private retryAttempt = 0;
  private isExplicitDisconnect = false;

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.readAt).length);
  readonly isConnected = signal<boolean>(false);
  readonly isConnecting = signal<boolean>(false);

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
        tap(items => this.notifications.set(items))
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
        const notif: AppNotification = JSON.parse(event.data);
        this.notifications.update(list => [notif, ...list.filter(n => n.id !== notif.id)]);
        this.playNotificationSound();
        this.toast.info(notif.title, notif.body);
      } catch (e) {
        console.error('Error parsing notification SSE payload', e);
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
  }

  /**
   * Đánh dấu một thông báo là đã đọc (cập nhật lạc quan signal và gọi backend).
   */
  markAsRead(id: string): void {
    const now = new Date().toISOString();
    this.notifications.update(list =>
      list.map(n => (n.id === id ? {...n, readAt: now, status: 'READ'} : n))
    );
    this.http.patch(this.appConfig.getEndpointFor(`api/v1/notifications/${id}/read`), {}).subscribe();
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc.
   */
  markAllAsRead(): void {
    const now = new Date().toISOString();
    this.notifications.update(list =>
      list.map(n => ({...n, readAt: n.readAt || now, status: 'READ'}))
    );
    this.http.patch(this.appConfig.getEndpointFor('api/v1/notifications/read-all'), {}).subscribe();
  }

  /**
   * Xóa một thông báo theo ID (cập nhật lạc quan signal và gọi backend).
   */
  deleteNotification(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
    this.http.delete(this.appConfig.getEndpointFor(`api/v1/notifications/${id}`)).subscribe();
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

  /**
   * Âm thanh thông báo nhẹ nhàng qua Web Audio API không phụ thuộc file tĩnh.
   */
  private playNotificationSound(): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
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
}
