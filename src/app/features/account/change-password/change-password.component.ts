import { ChangeDetectionStrategy, Component, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { merge, Subscription } from 'rxjs';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';

import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { LoginService } from '../../login/login.service';
import { LoginException } from '../../login/login.model';

const PASSWORD_REGEX = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) {
    return null;
  }
  if (/\s/.test(value)) {
    return { whitespace: true };
  }
  return null;
}

function specialCharValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) {
    return null;
  }
  if (SPECIAL_CHAR_REGEX.test(value)) {
    return null;
  }
  return { special: true };
}

@Component({
  selector: 'app-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NzInputModule, NzIconDirective, NzCardModule, AppButtonComponent],
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

  readonly passwordChecks = signal<{ minLength: boolean; noWhitespace: boolean; hasSpecial: boolean }>({
    minLength: false,
    noWhitespace: false,
    hasSpecial: false,
  });
  readonly confirmMatch = signal<null | boolean>(null);

  private pwdSub: Subscription | undefined = undefined;

  private readonly loginService = inject(LoginService);
  private readonly toast = inject(AppNotificationService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

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
          specialCharValidator,
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

    const pwd = this.form.controls.newPassword;
    const confirm = this.form.controls.confirmPassword;
    this.pwdSub = merge(pwd.valueChanges, confirm.valueChanges).subscribe(() => {
      const v = pwd.value || '';
      this.passwordChecks.set({
        minLength: v.length >= 8,
        noWhitespace: v.length > 0 && !/\s/.test(v),
        hasSpecial: SPECIAL_CHAR_REGEX.test(v),
      });
      const c = confirm.value || '';
      if (c) {
        this.confirmMatch.set(c === v);
      } else {
        this.confirmMatch.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.pwdSub) {
      this.pwdSub.unsubscribe();
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl(this.backLink());
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
        let msg = 'Đổi mật khẩu thất bại, vui lòng thử lại.';
        if (err instanceof LoginException) {
          msg = err.message;
        }
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
    const newCtrl = group.get('newPassword');
    const confirmCtrl = group.get('confirmPassword');
    let pwd = '';
    if (newCtrl) {
      pwd = newCtrl.value as string;
    }
    let confirm = '';
    if (confirmCtrl) {
      confirm = confirmCtrl.value as string;
    }
    if (!confirm) {
      return null;
    }
    if (pwd === confirm) {
      return null;
    }
    return { mismatch: true };
  }
}

export default ChangePasswordComponent;
