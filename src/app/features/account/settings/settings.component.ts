import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzAvatarComponent } from 'ng-zorro-antd/avatar';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTooltipDirective } from 'ng-zorro-antd/tooltip';
import { AccountService } from '../../../core/auth/account.service';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import ChangePasswordComponent from '../change-password/change-password.component';

type SettingsTab = 'profile' | 'password' | '2fa' | 'notification';

interface NavItem {
  key: SettingsTab;
  icon: string;
  label: string;
  desc: string;
}

@Component({
  selector: 'app-account-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NzIconDirective,
    NzCardModule,
    NzAvatarComponent,
    NzInputModule,
    NzGridModule,
    NzDividerModule,
    NzSkeletonModule,
    NzTooltipDirective,
    AppButtonComponent,
    ChangePasswordComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  standalone: true,
})
export class AccountSettingsComponent {
  readonly account = inject(AccountService).account;
  readonly activeTab = signal<SettingsTab>('profile');
  readonly navItems: NavItem[] = [
    { key: 'profile', icon: 'user', label: 'Thông tin cá nhân', desc: 'Hồ sơ cá nhân' },
    { key: 'password', icon: 'lock', label: 'Đổi mật khẩu', desc: 'Bảo vệ tài khoản' },
    { key: '2fa', icon: 'safety', label: 'Bảo mật 2 lớp', desc: 'Xác thực bổ sung' },
    { key: 'notification', icon: 'bell', label: 'Thông báo', desc: 'Tùy chọn thông báo' },
  ];
  readonly displayName = computed(() => {
    const acc = this.account();
    if (!acc) {
      return 'Người dùng';
    }
    const first = acc.firstName?.trim() ?? '';
    const last = acc.lastName?.trim() ?? '';
    const full = `${first} ${last}`.trim();
    if (full) {
      return full;
    }
    return acc.login || 'Người dùng';
  });
  readonly displayEmail = computed(() => {
    const acc = this.account();
    return acc?.email?.trim() ?? '';
  });
  readonly avatarInitial = computed(() => {
    const acc = this.account();
    const src = acc?.firstName || acc?.login || 'U';
    return src.charAt(0).toUpperCase();
  });
  readonly avatarUrl = computed(() => {
    const acc = this.account();
    return acc?.imageUrl ?? null;
  });
  readonly accountStatus = computed(() => {
    const acc = this.account();
    return acc?.activated ? 'Đang hoạt động' : 'Ngừng hoạt động';
  });
  readonly profileForm = inject(FormBuilder).group({
    username: [{ value: '', disabled: true }],
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    phone: ['', [Validators.pattern(/^[0-9+ ]{9,15}$/)]],
    branch: [{ value: '', disabled: true }],
  });

  private readonly toast = inject(AppNotificationService);

  constructor() {
    const acc = this.account();
    if (acc) {
      const first = acc.firstName ?? '';
      const last = acc.lastName ?? '';
      const full = `${first} ${last}`.trim() || acc.login || '';
      const branch = acc.donViSuDungName ?? acc.organizations?.[0]?.OrganizationName ?? 'Chưa gán chi nhánh';
      this.profileForm.patchValue({
        username: acc.login,
        fullName: full,
        email: acc.email,
        phone: '',
        branch,
      });
    }
  }

  selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toast.error('Vui lòng kiểm tra lại thông tin.');
      return;
    }
    this.toast.success('Đã lưu thay đổi hồ sơ (demo).');
  }

  resetProfile(): void {
    const acc = this.account();
    const first = acc?.firstName ?? '';
    const last = acc?.lastName ?? '';
    const full = `${first} ${last}`.trim() || acc?.login || '';
    const branch = acc?.donViSuDungName ?? acc?.organizations?.[0]?.OrganizationName ?? 'Chưa gán chi nhánh';
    // Chỉ reset field cho phép sửa, giữ nguyên disabled field
    this.profileForm.controls['fullName'].reset(full);
    this.profileForm.controls['email'].reset(acc?.email ?? '');
    this.profileForm.controls['phone'].reset('');
    // Đảm bảo disabled field không bị xóa
    this.profileForm.controls['username'].setValue(acc?.login ?? '');
    this.profileForm.controls['branch'].setValue(branch);
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
  }

  comingSoon(): void {
    this.toast.info('Chức năng đang được phát triển.');
  }
}

export default AccountSettingsComponent;
