import {Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {NzIconDirective} from 'ng-zorro-antd/icon';
import {LayoutService} from '../service/layout.service';
import {ThemeService} from '../../core/theme/theme.service';
import {NzAvatarComponent} from 'ng-zorro-antd/avatar';
import {NzDropdownDirective, NzDropdownMenuComponent} from 'ng-zorro-antd/dropdown';
import {NzMenuDirective, NzMenuItemComponent, NzMenuDividerDirective} from 'ng-zorro-antd/menu';
import {NzSpinComponent} from 'ng-zorro-antd/spin';
import {NzTooltipDirective} from 'ng-zorro-antd/tooltip';
import {AccountService} from '../../core/auth/account.service';
import {LoginService} from '../../features/login/login.service';
import {BranchService} from '../../core/auth/branch.service';
import {AppNotificationService} from '../../shared/app-notification/app-notification.service';
import {BranchResponse} from '../../features/login/login.model';
import {RealtimeNotificationService} from '../../core/notification/realtime-notification.service';
import {NotificationBellComponent} from './notification-bell/notification-bell.component';
import MenuSearchComponent from '../../shared/app-menu-search/app-menu-search.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [
    RouterLink,
    FormsModule,
    NzIconDirective,
    NzAvatarComponent,
    NzDropdownDirective,
    NzDropdownMenuComponent,
    NzMenuDirective,
    NzMenuItemComponent,
    NzMenuDividerDirective,
    NzSpinComponent,
    MenuSearchComponent,
    NotificationBellComponent,
  ],
  standalone: true,
})
export class HeaderComponent implements OnInit, OnDestroy {
  readonly theme = inject(ThemeService);
  private readonly layoutService = inject(LayoutService);
  private readonly accountService = inject(AccountService);
  private readonly loginService = inject(LoginService);
  private readonly branchService = inject(BranchService);
  private readonly toast = inject(AppNotificationService);
  private readonly realtimeNotificationService = inject(RealtimeNotificationService);

  protected account = this.accountService.account;
  protected sidebarCollapsed = this.layoutService.sidebarCollapsed;
  protected isVisibleUserMenu = signal(false);

  // Branch switcher state
  protected currentBranch = this.branchService.currentBranch;
  protected availableBranches = this.branchService.branches;
  protected isBranchesLoading = this.branchService.loading;
  protected isVisibleBranchMenu = signal(false);
  protected isSwitchingBranch = signal(false);
  protected branchSearchText = signal('');

  protected filteredBranches = computed(() => {
    const list = this.availableBranches();
    const query = this.branchSearchText().trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter(
      b =>
        b.name?.toLowerCase().includes(query) ||
        b.code?.toLowerCase().includes(query) ||
        b.address?.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.branchService.loadMine().subscribe();
    this.realtimeNotificationService.loadRecent().subscribe();
    this.realtimeNotificationService.connect();
  }

  ngOnDestroy(): void {
    this.realtimeNotificationService.disconnect();
  }

  onToggleSidebar(): void {
    this.layoutService.toggleSidebar();
  }

  onBrandColorChange(event: Event): void {
    this.theme.setBrandColor((event.target as HTMLInputElement).value);
  }

  onSwitchBranch(branch: BranchResponse): void {
    if (branch.id === this.currentBranch()?.id) {
      this.isVisibleBranchMenu.set(false);
      return;
    }
    this.isSwitchingBranch.set(true);
    this.loginService.selectBranch(branch.id).subscribe({
      next: () => {
        this.branchService.setCurrentBranch(branch);
        this.toast.success('Đổi chi nhánh thành công', `Đang làm việc tại ${branch.name}`);
        this.isVisibleBranchMenu.set(false);
        setTimeout(() => {
          window.location.reload();
        }, 250);
      },
      error: () => {
        this.isSwitchingBranch.set(false);
        this.toast.error('Chuyển chi nhánh thất bại, vui lòng thử lại.');
      },
    });
  }

  onLogout(): void {
    this.realtimeNotificationService.disconnect();
    this.loginService.logout().subscribe({
      next: () => {
        this.theme.savePreLogoutMode();
        this.theme.setMode('light');
        this.theme.savePreLogoutBrand();
        this.theme.resetBrand();
      },
    });
  }
}
