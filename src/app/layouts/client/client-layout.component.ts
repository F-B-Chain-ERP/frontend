import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, effect, inject, signal} from '@angular/core';
import {RouterOutlet, RouterLink} from '@angular/router';
import {CommonModule} from '@angular/common';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {ClientNavbarComponent} from './client-navbar/client-navbar.component';
import {AccountService} from '../../core/auth/account.service';
import {RealtimeNotificationService} from '../../core/notification/realtime-notification.service';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, NzIconModule, ClientNavbarComponent],
  templateUrl: './client-layout.component.html',
  styleUrls: ['./client-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientLayoutComponent implements OnInit, OnDestroy {
  private readonly accountService = inject(AccountService);
  private readonly realtimeNotification = inject(RealtimeNotificationService);

  readonly showAnnouncement = signal(true);

  constructor() {
    effect(() => {
      const user = this.accountService.account();
      if (user) {
        this.realtimeNotification.loadRecent().subscribe({error: () => undefined});
        this.realtimeNotification.connect();
      } else {
        this.realtimeNotification.disconnect();
      }
    });
  }

  dismissAnnouncement(): void {
    this.showAnnouncement.set(false);
  }

  ngOnInit(): void {
    // Try to restore user identity if token exists, but don't block
    this.accountService.identity().subscribe();
  }

  ngOnDestroy(): void {
    this.realtimeNotification.disconnect();
  }
}

export default ClientLayoutComponent;
