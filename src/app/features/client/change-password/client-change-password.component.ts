import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

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
      [backLink]="'/store'"
      successMessage="Đặt lại mật khẩu thành công."
    />
  `,
  standalone: true,
})
export class ClientChangePasswordComponent {
  private readonly accountService = inject(AccountService);
  readonly account = this.accountService.account;

  /** Khách hàng đăng nhập Google (chưa có mật khẩu cục bộ) thì không yêu cầu mật khẩu hiện tại. */
  requireCurrent(): boolean {
    return this.account()?.hasLocalPassword ?? true;
  }
}

export default ClientChangePasswordComponent;
