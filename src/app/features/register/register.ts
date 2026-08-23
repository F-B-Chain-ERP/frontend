import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { AppButtonComponent } from '../../shared/app-button/app-button.component';
import { ThemeService } from '../../core/theme/theme.service';
import { AppNotificationService } from '../../shared/app-notification/app-notification.service';
import { GoogleIdentityService } from '../../core/auth/google-identity.service';
import { AuthResponse, LoginException, RegisterCustomerRequest } from '../login/login.model';
import { LoginService } from '../login/login.service';

const PASSWORD_REGEX = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;

function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;
  return /\s/.test(value) ? { whitespace: true } : null;
}

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, NzInputModule, NzIconDirective, NzButtonModule, AppButtonComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.scss'],
  standalone: true,
})
export class RegisterComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly toast = inject(AppNotificationService);
  private readonly loginService = inject(LoginService);
  private readonly googleIdentity = inject(GoogleIdentityService);
  private googleSub?: Subscription;

  readonly loading = signal(false);
  readonly googleLoading = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);
  readonly currentYear = new Date().getFullYear();

  registerForm = new FormGroup(
    {
      fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
      phone: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^[0-9]{9,11}$/)],
      }),
      email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
      username: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(3), noWhitespaceValidator],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6), noWhitespaceValidator, Validators.pattern(PASSWORD_REGEX)],
      }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      agree: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    },
    { validators: this.passwordMatchValidator },
  );

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pwd = (group.get('password')?.value as string) ?? '';
    const confirm = (group.get('confirmPassword')?.value as string) ?? '';
    if (!confirm) return null;
    return pwd === confirm ? null : { mismatch: true };
  }

  ngOnInit(): void {
    this.theme.applyModeVisualOnly('light');
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

  toggleConfirm(): void {
    this.showConfirm.update(v => !v);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { fullName, phone, email, username, password } = this.registerForm.getRawValue();
    const request: RegisterCustomerRequest = {
      fullName: fullName.trim(),
      username: username.trim(),
      phone,
      email,
      password,
      authProvider: 'LOCAL',
    };

    this.loginService.register(request).subscribe({
      next: auth => this.handleRegisterResult(auth, request.email ?? ''),
      error: err => this.handleError(err),
    });
  }

  onGoogleSignUp(): void {
    this.googleLoading.set(true);
    this.googleIdentity.signIn();
  }

  private onGoogleCredential(idToken: string): void {
    this.googleLoading.set(true);
    this.loginService.loginWithGoogle(idToken).subscribe({
      next: () => {
        this.googleLoading.set(false);
        this.toast.success('Đăng ký qua Google thành công!', 'Chào mừng bạn đến với ERP UTT.');
        this.router.navigate(['/store']);
      },
      error: err => {
        this.googleLoading.set(false);
        this.handleError(err);
      },
    });
  }

  private handleRegisterResult(auth: AuthResponse, email: string): void {
    this.loading.set(false);
    if (auth.requiresEmailVerification && auth.verifyToken) {
      this.toast.success('Đăng ký thành công!', 'Mã xác thực đã được gửi đến email của bạn.');
      this.router.navigate(['/verify-email'], { queryParams: { token: auth.verifyToken, email } });
    } else if (auth.accessToken && auth.refreshToken) {
      this.toast.success('Đăng ký thành công!', 'Chào mừng bạn đến với ERP UTT.');
      this.router.navigate(['/store']);
    } else {
      this.toast.success('Đăng ký thành công!');
      this.router.navigate(['/login']);
    }
  }

  private handleError(err: unknown): void {
    this.loading.set(false);
    this.googleLoading.set(false);
    const message = err instanceof LoginException ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại.';
    this.toast.error(message);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}

export default RegisterComponent;
