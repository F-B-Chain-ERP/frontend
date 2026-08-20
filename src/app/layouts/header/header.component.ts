import { Component, inject, signal } from '@angular/core';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { LayoutService } from '../service/layout.service';
import { ThemeService } from '../../core/theme/theme.service';
import { NzAvatarComponent } from 'ng-zorro-antd/avatar';
import { NzDropdownDirective, NzDropdownMenuComponent } from 'ng-zorro-antd/dropdown';
import { NzMenuDirective, NzMenuItemComponent, NzMenuDividerDirective } from 'ng-zorro-antd/menu';
import { AccountService } from '../../core/auth/account.service';
import { LoginService } from '../../features/login/login.service';
import MenuSearchComponent from '../../shared/app-menu-search/app-menu-search.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [
    NzIconDirective,
    NzAvatarComponent,
    NzDropdownDirective,
    NzDropdownMenuComponent,
    NzMenuDirective,
    NzMenuItemComponent,
    NzMenuDividerDirective,
    MenuSearchComponent,
  ],
  standalone: true,
})
export class HeaderComponent {
  readonly theme = inject(ThemeService);
  private readonly layoutService = inject(LayoutService);
  private readonly accountService = inject(AccountService);
  private readonly loginService = inject(LoginService);

  protected account = this.accountService.account;
  protected sidebarCollapsed = this.layoutService.sidebarCollapsed;
  protected isVisibleUserMenu = signal(false);

  onToggleSidebar() {
    this.layoutService.toggleSidebar();
  }

  onBrandColorChange(event: Event): void {
    this.theme.setBrandColor((event.target as HTMLInputElement).value);
  }

  onLogout() {
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
