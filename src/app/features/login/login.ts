import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of, switchMap } from 'rxjs';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { AppButtonComponent } from '../../shared/app-button/app-button.component';
import { StateStorageService } from '../../core/auth/state-storage.service';
import { AccountService } from '../../core/auth/account.service';
import { Account } from '../../core/auth/account.model';
import { PermissionService } from '../../core/auth/permission.service';
import { LoginException, Organization, SandboxLoginResponse } from './login.model';
import { LoginService } from './login.service';
import { ThemeService } from '../../core/theme/theme.service';

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
  imports: [ReactiveFormsModule, NzInputModule, NzIconDirective, NzButtonModule, NzSelectModule, AppButtonComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.scss', './login-select-unit.scss'],
  standalone: true,
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly accountService = inject(AccountService);
  private readonly permissionService = inject(PermissionService);
  private readonly theme = inject(ThemeService);

  readonly viewMode = signal<'credentials' | 'organization'>('credentials');

  readonly loginError = signal<LoginErrorType>(null);
  readonly errorMessage = signal<string>('');
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly currentYear = new Date().getFullYear();

  readonly fullName = signal<string>('');
  readonly parentOrganizationName = signal<string>('');
  readonly organizations = signal<Organization[]>([]);

  private flowData: SandboxLoginResponse | null = null;

  loginForm = new FormGroup({
    username: new FormControl('dev', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('dev', {
      nonNullable: true,
      validators: [Validators.required, noWhitespaceValidator, Validators.pattern(PASSWORD_REGEX)],
    }),
    rememberMe: new FormControl({ value: true, disabled: false }, { nonNullable: true }),
  });

  unitForm = new FormGroup({
    organizationId: new FormControl<string | number | null>(null, { validators: [Validators.required] }),
  });

  ngOnInit(): void {
    this.theme.applyModeVisualOnly('light');

    if (this.stateStorageService.getAuthenticationToken()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnDestroy(): void {
    this.theme.restoreSavedMode();
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
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
      next: data => {
        this.flowData = data;
        const organizations = data.UseOrganizationList ?? [];
        const defaultOrgId = organizations.length > 0 ? organizations[0].OrganizationId : (data.DonViTrucThuocId ?? 0);
        this.completeLogin(data, defaultOrgId);
      },
      error: err => this.handleLoginError(err),
    });
  }

  onSubmitOrganization(): void {
    if (this.unitForm.invalid) {
      this.unitForm.markAllAsTouched();
      return;
    }

    const { organizationId } = this.unitForm.getRawValue();

    if (!this.flowData || organizationId == null) {
      this.errorMessage.set('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại.');
      return;
    }

    this.completeLogin(this.flowData, organizationId);
  }

  backToLogin(): void {
    this.flowData = null;
    this.loginForm.reset({ username: '', password: '', rememberMe: false });
    this.unitForm.reset();
    this.loginError.set(null);
    this.errorMessage.set('');
    this.viewMode.set('credentials');
  }

  private completeLogin(flowData: SandboxLoginResponse, organizationId: number | string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const isFullPermission = Number(flowData.IsFullPermission) === 1;
    const roleId = flowData.RolesId ?? flowData.RoleId;

    this.loginService
      .authenticate(flowData, organizationId)
      .pipe(
        switchMap(token => {
          this.stateStorageService.storeAuthenticationToken(token, true);
          if (!roleId) {
            return of([]);
          }
          return this.permissionService.loadFunctions(Number(roleId), isFullPermission);
        }),
      )
      .subscribe({
        next: authorities => {
          const account = new Account(
            !flowData.IsBlacklist,
            authorities,
            flowData.Email ?? '',
            flowData.FullName ?? null,
            'vi',
            null,
            flowData.UserName,
            flowData.Avatar ?? null,
            flowData.UseOrganizationList ?? [],
            organizationId,
            flowData.DonViSuDungId,
            flowData.CustomerName,
          );
          this.accountService.authenticate(account);

          this.theme.restorePreLogoutMode();
          this.theme.restorePreLogoutBrand();

          this.loading.set(false);
          this.router.navigate(['/home']);
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
