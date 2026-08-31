import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzAvatarModule} from 'ng-zorro-antd/avatar';
import {NzTooltipModule} from 'ng-zorro-antd/tooltip';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzDropDownModule} from 'ng-zorro-antd/dropdown';
import {NzMenuModule} from 'ng-zorro-antd/menu';
import {AppButtonComponent} from '../../../shared/app-button/app-button.component';
import {CartService} from '../../../shared/services/cart.service';
import {AccountService} from '../../../core/auth/account.service';
import {LoginService} from '../../../features/login/login.service';
import {ThemeService} from '../../../core/theme/theme.service';

@Component({
  selector: 'app-client-navbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzIconModule,
    NzAvatarModule,
    NzTooltipModule,
    NzInputModule,
    NzDropDownModule,
    NzMenuModule,
    AppButtonComponent,
  ],
  templateUrl: './client-navbar.component.html',
  styleUrls: ['./client-navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientNavbarComponent {
  readonly cartService = inject(CartService);
  readonly accountService = inject(AccountService);
  readonly theme = inject(ThemeService);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);

  readonly isUserMenuOpen = signal(false);
  readonly isMobileMenuOpen = signal(false);
  navSearchText = '';

  readonly account = this.accountService.account;

  /** Chỉ hiển thị liên kết quay lại trang quản trị khi người dùng là tài khoản nội bộ (admin/nhân viên). */
  readonly isAdmin = computed(() => {
    const user = this.account();
    return user && user.principalType === 'ACCOUNT';
  });

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(amount);
  }

  toggleTheme(): void {
    this.theme.toggleMode();
  }

  onBrandColorChange(event: Event): void {
    this.theme.setBrandColor((event.target as HTMLInputElement).value);
  }

  openCart(): void {
    this.router.navigate(['/store/cart']);
  }

  onNavSearch(): void {
    if (this.navSearchText.trim()) {
      this.router.navigate(['/store'], {queryParams: {q: this.navSearchText.trim()}});
    }
  }

  scrollToSection(sectionId: string): void {
    this.isMobileMenuOpen.set(false);
    if (this.router.url.startsWith('/store')) {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'start'});
      }
    } else {
      this.router.navigate(['/store'], {fragment: sectionId});
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToSettings(): void {
    const account = this.account();
    if (account && account.principalType === 'CUSTOMER') {
      this.router.navigate(['/store/settings']);
    } else {
      this.router.navigate(['/admin/account/settings']);
    }
  }

  goToAdminHome(): void {
    this.router.navigate(['/admin/home']);
  }

  logout(): void {
    this.loginService.logout().subscribe();
  }
}

export default ClientNavbarComponent;
