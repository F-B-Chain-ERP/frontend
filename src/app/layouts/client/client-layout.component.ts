import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ClientNavbarComponent } from './client-navbar/client-navbar.component';
import { AccountService } from '../../core/auth/account.service';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, NzIconModule, ClientNavbarComponent],
  templateUrl: './client-layout.component.html',
  styleUrls: ['./client-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientLayoutComponent implements OnInit {
  private readonly accountService = inject(AccountService);

  readonly showAnnouncement = signal(true);

  dismissAnnouncement(): void {
    this.showAnnouncement.set(false);
  }

  ngOnInit(): void {
    // Try to restore user identity if token exists, but don't block
    this.accountService.identity().subscribe();
  }
}
export default ClientLayoutComponent;
