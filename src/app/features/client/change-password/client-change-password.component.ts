import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AccountService } from '../../../core/auth/account.service';
import { ChangePasswordComponent } from '../../account/change-password/change-password.component';

@Component({
  selector: 'app-client-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChangePasswordComponent],
  template: `
    <app-change-password
      [requireCurrentPassword]="requireCurrent()"
      heading="Đặt lại mật khẩu"
      [backLink]="backLink()"
      successMessage="Đặt lại mật khẩu thành công."
    />
  `,
  standalone: true,
})
export class ClientChangePasswordComponent {
  private readonly accountService = inject(AccountService);
  readonly account = this.accountService.account;

  /** Admin/nhân viên (ACCOUNT) dù vào trang store vẫn phải "Quay lại" về trang cài đặt admin. */
  readonly backLink = computed(() => {
    const account = this.account();
    if (account && account.principalType === 'ACCOUNT') {
      return '/admin/account/settings';
    }
    return '/store';
  });

  /** Khách hàng đăng nhập Google (chưa có mật khẩu cục bộ) thì không yêu cầu mật khẩu hiện tại. */
  requireCurrent(): boolean {
    const account = this.account();
    if (!account) {
      return true;
    }
    if (account.hasLocalPassword === undefined) {
      return true;
    }
    return account.hasLocalPassword;
  }
}

export default ClientChangePasswordComponent;
