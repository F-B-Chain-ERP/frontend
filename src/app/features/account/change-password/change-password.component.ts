import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';

import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { LoginService } from '../../login/login.service';
import { LoginException } from '../../login/login.model';

const PASSWORD_REGEX = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;

function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) {
    return null;
  }
  return /\s/.test(value) ? { whitespace: true } : null;
}

@Component({
  selector: 'app-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, NzInputModule, NzIconDirective, NzCardModule, AppButtonComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
  standalone: true,
})
export class ChangePasswordComponent implements OnInit {
  /** Khi false (khách hàng Google chưa có mật khẩu cục bộ), ẩn và bỏ yêu cầu mật khẩu hiện tại. */
  readonly requireCurrentPassword = input(true);
  readonly heading = input('Đổi mật khẩu');
  readonly backLink = input('/admin/account/settings');
  readonly successMessage = input('Đổi mật khẩu thành công.');

  readonly loading = signal(false);
  readonly showCurrent = signal(false);
  readonly showNew = signal(false);
  readonly showConfirm = signal(false);

  private readonly loginService = inject(LoginService);
  private readonly toast = inject(AppNotificationService);

  readonly form = new FormGroup(
    {
      currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
          noWhitespaceValidator,
          Validators.pattern(PASSWORD_REGEX),
        ],
      }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: this.passwordMatchValidator },
  );

  ngOnInit(): void {
    if (!this.requireCurrentPassword()) {
      this.form.controls.currentPassword.clearValidators();
      this.form.controls.currentPassword.setValue('');
      this.form.controls.currentPassword.updateValueAndValidity();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.loading.set(true);
    this.loginService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success(this.successMessage());
        this.form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      },
      error: err => {
        this.loading.set(false);
        const msg = err instanceof LoginException ? err.message : 'Đổi mật khẩu thất bại, vui lòng thử lại.';
        this.toast.error(msg);
      },
    });
  }

  toggleCurrent(): void {
    this.showCurrent.update(v => !v);
  }

  toggleNew(): void {
    this.showNew.update(v => !v);
  }

  toggleConfirm(): void {
    this.showConfirm.update(v => !v);
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pwd = (group.get('newPassword')?.value as string) ?? '';
    const confirm = (group.get('confirmPassword')?.value as string) ?? '';
    if (!confirm) {
      return null;
    }
    return pwd === confirm ? null : { mismatch: true };
  }
}

export default ChangePasswordComponent;
