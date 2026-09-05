import {Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {Router} from '@angular/router';
import {NzIconDirective} from 'ng-zorro-antd/icon';
import {NzBadgeComponent} from 'ng-zorro-antd/badge';
import {NzDropdownDirective, NzDropdownMenuComponent} from 'ng-zorro-antd/dropdown';
import {NzSpinComponent} from 'ng-zorro-antd/spin';
import {RealtimeNotificationService} from '../../../core/notification/realtime-notification.service';
import {AppNotification} from '../../../core/notification/notification.model';

export type NotificationFilterTab = 'ALL' | 'UNREAD' | 'PENDING' | 'APPROVED' | 'REJECTED';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    DatePipe,
    NzIconDirective,
    NzBadgeComponent,
    NzDropdownDirective,
    NzDropdownMenuComponent,
    NzSpinComponent,
  ],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
})
export class NotificationBellComponent {
  protected readonly notificationService = inject(RealtimeNotificationService);
  private readonly router = inject(Router);

  protected readonly notifications = this.notificationService.notifications;
  protected readonly unreadCount = this.notificationService.unreadCount;
  protected readonly isConnected = this.notificationService.isConnected;
  protected readonly isConnecting = this.notificationService.isConnecting;
  protected readonly isVisibleMenu = signal(false);

  protected readonly activeFilter = signal<NotificationFilterTab>('ALL');

  protected readonly totalCount = computed(() => this.notifications().length);
  protected readonly pendingCount = computed(() =>
    this.notifications().filter(n => this.isPending(n)).length
  );
  protected readonly approvedCount = computed(() =>
    this.notifications().filter(n => this.isApproved(n)).length
  );
  protected readonly rejectedCount = computed(() =>
    this.notifications().filter(n => this.isRejected(n)).length
  );

  protected readonly filteredNotifications = computed(() => {
    const list = this.notifications();
    switch (this.activeFilter()) {
      case 'UNREAD':
        return list.filter(n => !n.readAt);
      case 'PENDING':
        return list.filter(n => this.isPending(n));
      case 'APPROVED':
        return list.filter(n => this.isApproved(n));
      case 'REJECTED':
        return list.filter(n => this.isRejected(n));
      case 'ALL':
      default:
        return list;
    }
  });

  onFilterChange(tab: NotificationFilterTab, event: MouseEvent): void {
    event.stopPropagation();
    this.activeFilter.set(tab);
  }

  onNotificationClick(item: AppNotification): void {
    if (!item.readAt) {
      this.notificationService.markAsRead(item.id);
    }
    this.isVisibleMenu.set(false);

    const targetUrl = this.resolveTargetUrl(item);
    if (targetUrl) {
      this.router.navigateByUrl(targetUrl);
    }
  }

  onMarkAllAsRead(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead();
  }

  onDeleteAll(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationService.deleteAll();
  }

  onDeleteItem(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(id);
  }

  private isPending(n: AppNotification): boolean {
    if (n.type === 'PO_SUBMITTED') return true;
    const text = ((n.title || '') + ' ' + (n.body || '')).toLowerCase();
    return text.includes('chờ duyệt') || text.includes('trình duyệt');
  }

  private isApproved(n: AppNotification): boolean {
    if (n.type === 'PO_APPROVED') return true;
    const text = ((n.title || '') + ' ' + (n.body || '')).toLowerCase();
    return text.includes('đã được duyệt') || text.includes('phê duyệt') || text.includes('đã duyệt');
  }

  private isRejected(n: AppNotification): boolean {
    if (n.type === 'PO_REJECTED' || n.type === 'PO_CANCELLED') return true;
    const text = ((n.title || '') + ' ' + (n.body || '')).toLowerCase();
    return text.includes('từ chối') || text.includes('bị huỷ') || text.includes('hủy đơn');
  }

  private resolveTargetUrl(item: AppNotification): string | null {
    if (item.actionUrl) {
      return item.actionUrl;
    }
    const poMatch = item.body?.match(/PO-[\w-]+/) || item.title?.match(/PO-[\w-]+/);
    if (poMatch) {
      return `/admin/procurement/purchase-orders/list?code=${encodeURIComponent(poMatch[0])}`;
    }
    return null;
  }
}
