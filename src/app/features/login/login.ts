import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { AppButtonComponent } from '../../shared/app-button/app-button.component';
import { StateStorageService } from '../../core/auth/state-storage.service';
import { LoginException, LoginCredentials } from './login.model';
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
  imports: [ReactiveFormsModule, RouterLink, NzInputModule, NzIconDirective, NzButtonModule, AppButtonComponent],
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

  loginForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, noWhitespaceValidator, Validators.pattern(PASSWORD_REGEX)],
    }),
    rememberMe: new FormControl({ value: true, disabled: false }, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.theme.applyModeVisualOnly('light');

    if (this.stateStorageService.getAuthenticationToken()) {
      this.router.navigate(['/admin/home']);
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

  onGoogleLogin(): void {
    this.googleLoading.set(true);
    this.loginError.set(null);
    this.googleIdentity.signIn();
  }

  private onGoogleCredential(idToken: string): void {
    this.loginService.loginWithGoogle(idToken).subscribe({
      next: () => {
        this.googleLoading.set(false);
        this.theme.restorePreLogoutMode();
        this.theme.restorePreLogoutBrand();
        this.router.navigate(['/store']);
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
      next: () => {
        this.loading.set(false);
        this.theme.restorePreLogoutMode();
        this.theme.restorePreLogoutBrand();
        this.router.navigate(['/admin/home']);
      },
      error: err => this.handleLoginError(err),
    });
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
