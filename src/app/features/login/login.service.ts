import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, from, filter, tap, switchMap } from 'rxjs';

import { AuthServerProvider } from '../../core/auth/auth-jwt.service';
import { Login, LoginException, SandboxLoginResponse, AuthenticateRequest } from './login.model';
import { AccountService } from '../../core/auth/account.service';
import { PermissionService } from '../../core/auth/permission.service';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly authServerProvider = inject(AuthServerProvider);
  private readonly accountService = inject(AccountService);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);

  login(credentials: Login): Observable<SandboxLoginResponse> {
    return this.authServerProvider.postLogin(credentials).pipe(
      map(res => {
        switch (res.Code) {
          case '000':
            break;
          case '001':
            throw new LoginException('INVALID_CREDENTIALS', res.Message);
          case '002':
            throw new LoginException('ACCOUNT_LOCKED', res.Message);
          case '003':
            throw new LoginException('ACCOUNT_DELETED', res.Message);
          case '999':
            throw new LoginException('UNKNOWN', res.Message);
          default:
            throw new LoginException('UNKNOWN', res.Message ?? '');
        }

        const data = res.Data as SandboxLoginResponse | null;
        if (!data || !data.Id) {
          throw new LoginException('INVALID_CREDENTIALS', '');
        }

        return data;
      }),
    );
  }

  authenticate(data: SandboxLoginResponse, organizationId: number | string): Observable<string> {
    const payload: AuthenticateRequest = {
      Id: data.Id,
      EncryptId: data.EncryptId,
      UserName: data.UserName,
      FullName: data.FullName,
      Email: data.Email,
      DonViSuDungId: data.DonViSuDungId ?? 0,
      DonViTrucThuocId: organizationId,
      DonViTrucThuocIds: String(organizationId),
      RolesCode: data.RoleCode ?? undefined,
      RolesId: data.RoleId ?? undefined,
      IsFullPermission: data.IsFullPermission,
      IsBlacklist: data.IsBlacklist,
      StatusId: data.StatusId,
      ApplicationId: data.ApplicationId || 17,
    };

    return this.authServerProvider.postAuthenticate(payload).pipe(
      map(res => {
        if (!res || !res.access_token) {
          throw new LoginException('UNKNOWN', 'Không nhận được token từ hệ thống');
        }

        return res.access_token;
      }),
    );
  }

  logout(): Observable<void> {
    return from(this.router.navigate(['/login'])).pipe(
      filter(success => success),
      tap(() => {
        this.accountService.authenticate(null);
        this.permissionService.clear();
      }),
      switchMap(() => this.authServerProvider.logout()),
      map(() => void 0),
    );
  }
}
