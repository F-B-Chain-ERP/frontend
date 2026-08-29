import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconDirective } from 'ng-zorro-antd/icon';

import { AppButtonComponent } from '../../shared/app-button/app-button.component';
import { StateStorageService } from '../../core/auth/state-storage.service';
import { LoginException, LoginCredentials, PrincipalType } from './login.model';
import { LoginService } from './login.service';
import { ThemeService } from '../../core/theme/theme.service';
import { GoogleIdentityService } from '../../core/auth/google-identity.service';
import { AppNotificationService } from '../../shared/app-notification/app-notification.service';

type LoginErrorType = 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_DELETED' | 'UNKNOWN' | 'NO_ORGANIZATION' | null;
const PASSWORD_REGEX = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;

function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) {
    return null;
  }
  return /\s/.test(value) ? { whitespace: true } : null;
}

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, NzInputModule, NzIconDirective, AppButtonComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.scss', './login-select-unit.scss'],
  standalone: true,
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly theme = inject(ThemeService);
  private readonly googleIdentity = inject(GoogleIdentityService);
  private readonly toast = inject(AppNotificationService);
  private googleSub?: Subscription;

  readonly loginError = signal<LoginErrorType>(null);
  readonly errorMessage = signal<string>('');
  readonly loading = signal(false);
  readonly googleLoading = signal(false);
  readonly showPassword = signal(false);
  readonly currentYear = new Date().getFullYear();

  // ── Forgot password (in-page) ──────────────────────
  readonly mode = signal<'login' | 'forgot-email' | 'forgot-reset'>('login');
  readonly emailSentTo = signal('');
  readonly resetToken = signal('');
  readonly resending = signal(false);
  readonly showConfirm = signal(false);

  loginForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, noWhitespaceValidator, Validators.pattern(PASSWORD_REGEX)],
    }),
    rememberMe: new FormControl({ value: true, disabled: false }, { nonNullable: true }),
  });

  emailForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  resetForm = new FormGroup(
    {
      otp: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] }),
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
    this.theme.applyModeVisualOnly('light');

    if (this.stateStorageService.getAuthenticationToken()) {
      if (this.stateStorageService.hasPendingScopeAssignment()) {
        this.router.navigate(['/select-branch']);
      } else if (this.principalTypeFromToken() === 'CUSTOMER') {
        this.router.navigate(['/store']);
      } else {
        this.router.navigate(['/admin/home']);
      }
    }

    this.googleIdentity.load();
    this.googleSub = this.googleIdentity.onCredential().subscribe(idToken => this.onGoogleCredential(idToken));
  }

  ngOnDestroy(): void {
    this.theme.restoreSavedMode();
    this.googleSub?.unsubscribe();
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  // ── Forgot password flow ───────────────────────────
  switchToForgot(): void {
    this.loginError.set(null);
    this.mode.set('forgot-email');
  }

  backToLogin(): void {
    this.mode.set('login');
    this.emailForm.reset({ email: '' });
    this.resetForm.reset({ otp: '', newPassword: '', confirmPassword: '' });
    this.resetToken.set('');
    this.emailSentTo.set('');
  }

  toggleConfirm(): void {
    this.showConfirm.update(v => !v);
  }

  submitForgotEmail(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    const email = this.emailForm.controls.email.value.trim();
    this.loading.set(true);
    this.loginService.forgotPassword(email, 'CUSTOMER').subscribe({
      next: auth => {
        this.loading.set(false);
        const token = auth.verifyToken ?? auth.resetToken ?? '';
        if (!token) {
          this.toast.error('Không nhận được phiên đặt lại mật khẩu, vui lòng thử lại.');
          return;
        }
        this.resetToken.set(token);
        this.emailSentTo.set(email);
        this.mode.set('forgot-reset');
        this.toast.success('Mã OTP đã được gửi đến email của bạn.');
      },
      error: err => {
        this.loading.set(false);
        const msg = err instanceof LoginException ? err.message : 'Gửi mã thất bại, vui lòng thử lại.';
        this.toast.error(msg);
      },
    });
  }

  submitReset(): void {
    if (this.resetForm.invalid || !this.resetToken()) {
      this.resetForm.markAllAsTouched();
      return;
    }
    const { otp, newPassword } = this.resetForm.getRawValue();
    this.loading.set(true);
    this.loginService.resetPassword(this.resetToken(), otp, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
        this.backToLogin();
      },
      error: err => {
        this.loading.set(false);
        const msg = err instanceof LoginException ? err.message : 'Đặt lại mật khẩu thất bại, vui lòng thử lại.';
        this.toast.error(msg);
      },
    });
  }

  resendOtp(): void {
    if (this.resending()) return;
    const email = this.emailSentTo();
    if (!email) return;
    this.resending.set(true);
    this.loginService.forgotPassword(email, 'CUSTOMER').subscribe({
      next: auth => {
        this.resending.set(false);
        const token = auth.verifyToken ?? auth.resetToken ?? '';
        if (token) this.resetToken.set(token);
        this.toast.success('Mã OTP mới đã được gửi đến email của bạn.');
      },
      error: err => {
        this.resending.set(false);
        const msg = err instanceof LoginException ? err.message : 'Gửi lại mã thất bại, vui lòng thử lại.';
        this.toast.error(msg);
      },
    });
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pwd = (group.get('newPassword')?.value as string) ?? '';
    const confirm = (group.get('confirmPassword')?.value as string) ?? '';
    if (!confirm) return null;
    return pwd === confirm ? null : { mismatch: true };
  }

  onGoogleLogin(): void {
    this.googleLoading.set(true);
    this.loginError.set(null);
    this.googleIdentity.signIn();
  }

  private onGoogleCredential(idToken: string): void {
    this.loginService.loginWithGoogle(idToken).subscribe({
      next: auth => {
        this.googleLoading.set(false);
        this.theme.restorePreLogoutMode();
        this.theme.restorePreLogoutBrand();
        if (auth.requiresScopeAssignment) {
          this.router.navigate(['/select-branch']);
        } else if (auth.principalType === 'CUSTOMER') {
          this.router.navigate(['/store']);
        } else {
          this.router.navigate(['/admin/home']);
        }
      },
      error: err => {
        this.googleLoading.set(false);
        this.handleLoginError(err);
      },
    });
  }

  onSubmitCredentials(): void {
    const username = this.loginForm.controls.username;
    username.setValue(username.value.trim());

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.loginError.set(null);

    const credentials = this.loginForm.getRawValue();

    this.loginService.login(credentials).subscribe({
      next: auth => {
        this.loading.set(false);
        this.theme.restorePreLogoutMode();
        this.theme.restorePreLogoutBrand();
        if (auth.requiresScopeAssignment) {
          this.router.navigate(['/select-branch']);
        } else if (auth.principalType === 'CUSTOMER') {
          this.router.navigate(['/store']);
        } else {
          this.router.navigate(['/admin/home']);
        }
      },
      error: err => this.handleLoginError(err),
    });
  }

  private principalTypeFromToken(): PrincipalType | null {
    const token = this.stateStorageService.getAuthenticationToken();
    if (!token) {
      return null;
    }
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded.principalType ?? null;
    } catch {
      return null;
    }
  }

  private handleLoginError(err: unknown): void {
    this.loading.set(false);
    if (err instanceof LoginException) {
      this.loginError.set(err.type);
      this.errorMessage.set(err.message);
    } else {
      this.loginError.set('UNKNOWN');
      this.errorMessage.set('Đã có lỗi xảy ra, vui lòng thử lại.');
    }
  }
}

export default LoginComponent;
