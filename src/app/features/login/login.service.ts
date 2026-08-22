import {Injectable, inject} from '@angular/core';
import {Router} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {Observable, catchError, from, filter, map, switchMap, tap, throwError} from 'rxjs';

import {AuthServerProvider} from '../../core/auth/auth-jwt.service';
import {AccountService} from '../../core/auth/account.service';
import {PermissionService} from '../../core/auth/permission.service';
import {StateStorageService} from '../../core/auth/state-storage.service';
import {Account} from '../../core/auth/account.model';
import {AuthResponse, LoginCredentials, LoginException} from './login.model';

@Injectable({providedIn: 'root'})
export class LoginService {
  private readonly authServerProvider = inject(AuthServerProvider);
  private readonly accountService = inject(AccountService);
  private readonly permissionService = inject(PermissionService);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly router = inject(Router);

  login(credentials: LoginCredentials): Observable<Account> {
    return this.authServerProvider.login(credentials).pipe(
      map(res => {
        const auth = res.data;
        this.stateStorageService.storeAuthenticationToken(auth.accessToken, credentials.rememberMe);
        this.stateStorageService.storeRefreshToken(auth.refreshToken, credentials.rememberMe);
        const account = this.toAccount(auth);
        this.accountService.authenticate(account);
        return account;
      }),
      catchError((err: HttpErrorResponse) => throwError(() => this.toLoginException(err))),
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

  private toAccount(auth: AuthResponse): Account {
    const acc = auth.account;
    const isSuperAdmin = acc.username === 'admin';
    const authorities = isSuperAdmin ? ['FULL_PERMISSION'] : [];
    return new Account(
      acc.status === 'ACTIVE',
      authorities,
      acc.email ?? '',
      acc.fullName ?? null,
      'vi',
      null,
      acc.username,
      null,
      [],
      null,
    );
  }

  private toLoginException(err: HttpErrorResponse): LoginException {
    const errorCode = err.error?.errorCode;
    if (err.status === 401 && errorCode === 'ERR_401_BAD_CREDENTIALS') {
      return new LoginException('INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không đúng.');
    }
    if (err.status === 403 && errorCode === 'ERR_403_ACCOUNT_DISABLED') {
      return new LoginException('ACCOUNT_LOCKED', 'Tài khoản đã bị vô hiệu hóa.');
    }
    if (err.status === 401 && errorCode === 'ACCOUNT_LOCKED') {
      return new LoginException('ACCOUNT_LOCKED', 'Tài khoản tạm thời bị khóa.');
    }
    return new LoginException('UNKNOWN', err.error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.');
  }
}
