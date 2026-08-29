import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';

interface SettingItem {
  icon: string;
  title: string;
  desc: string;
  route?: string;
  soon?: boolean;
}

@Component({
  selector: 'app-account-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NzIconDirective, NzCardModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  standalone: true,
})
export class AccountSettingsComponent {
  readonly items: SettingItem[] = [
    {
      icon: 'lock',
      title: 'Đổi mật khẩu',
      desc: 'Cập nhật mật khẩu hiện tại để bảo vệ tài khoản của bạn.',
      route: '/admin/account/change-password',
    },
    {
      icon: 'user',
      title: 'Thông tin cá nhân',
      desc: 'Quản lý họ tên, email và số điện thoại.',
      soon: true,
    },
    {
      icon: 'safety',
      title: 'Bảo mật hai lớp',
      desc: 'Bật xác thực 2 bước khi đăng nhập.',
      soon: true,
    },
    {
      icon: 'bell',
      title: 'Thông báo',
      desc: 'Tùy chỉnh email và thông báo từ hệ thống.',
      soon: true,
    },
  ];
}

export default AccountSettingsComponent;
