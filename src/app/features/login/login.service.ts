import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, from, map, of, switchMap, tap, throwError } from 'rxjs';

import { AuthServerProvider } from '../../core/auth/auth-jwt.service';
import { AccountService } from '../../core/auth/account.service';
import { PermissionService } from '../../core/auth/permission.service';
import { StateStorageService } from '../../core/auth/state-storage.service';
import { Account } from '../../core/auth/account.model';
import { AuthResponse, LoginCredentials, LoginException, PrincipalType, RegisterCustomerRequest } from './login.model';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly authServerProvider = inject(AuthServerProvider);
  private readonly accountService = inject(AccountService);
  private readonly permissionService = inject(PermissionService);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly router = inject(Router);

  /** Đăng nhập tài khoản nội bộ (admin/nhân viên). Mặc định type = ACCOUNT. */
  login(credentials: LoginCredentials, type: PrincipalType = 'ACCOUNT'): Observable<Account> {
    return this.authServerProvider.login(credentials, type).pipe(
      map(res => {
        const auth = res.data;
        this.applyAuthResult(auth, credentials.rememberMe);
        return this.toAccount(auth, credentials.username);
      }),
      catchError((err: HttpErrorResponse) => throwError(() => this.toLoginException(err))),
    );
  }

  /** Đăng nhập / đăng ký khách hàng qua Google (gửi Google ID token). */
  loginWithGoogle(idToken: string, rememberMe = true): Observable<Account> {
    return this.authServerProvider.loginWithGoogle(idToken).pipe(
      map(res => {
        const auth = res.data;
        this.applyAuthResult(auth, rememberMe);
        return this.toAccount(auth);
      }),
      catchError((err: HttpErrorResponse) => throwError(() => this.toLoginException(err))),
    );
  }

  /**
   * Đăng ký khách hàng. Backend trả về verifyToken (chưa cấp access token) khi
   * cần xác thực email qua OTP. Trả về AuthResponse thô để component xử lý tiếp.
   */
  register(request: RegisterCustomerRequest): Observable<AuthResponse> {
    return this.authServerProvider.registerCustomer(request).pipe(
      map(res => res.data),
      catchError((err: HttpErrorResponse) => throwError(() => this.toRegisterException(err))),
    );
  }

  /** Xác thực OTP email sau khi đăng ký / đăng nhập, trả về tài khoản đã xác thực. */
  verifyEmail(verifyToken: string, otp: string, rememberMe = true): Observable<Account> {
    return this.authServerProvider.verifyEmail({ verifyToken, otp }).pipe(
      map(res => {
        const auth = res.data;
        this.applyAuthResult(auth, rememberMe);
        return this.toAccount(auth);
      }),
      catchError((err: HttpErrorResponse) => throwError(() => this.toLoginException(err))),
    );
  }

  logout(): Observable<void> {
    return this.authServerProvider.logout().pipe(
      catchError(() => of(null)),
      tap(() => {
        this.accountService.authenticate(null);
        this.permissionService.clear();
      }),
      switchMap(() => from(this.router.navigate(['/login']))),
      map(() => void 0),
    );
  }

  private applyAuthResult(auth: AuthResponse, rememberMe: boolean): void {
    this.stateStorageService.storeAuthenticationToken(auth.accessToken, rememberMe);
    this.stateStorageService.storeRefreshToken(auth.refreshToken, rememberMe);
  }

  private toAccount(auth: AuthResponse, fallbackLogin = ''): Account {
    const isCustomer = auth.principalType === 'CUSTOMER';
    const customer = auth.customer;
    const login = isCustomer ? (customer?.email ?? customer?.phone ?? fallbackLogin) : fallbackLogin;
    const email = isCustomer ? (customer?.email ?? '') : '';
    const fullName = isCustomer ? (customer?.fullName ?? null) : null;
    const isSuperAdmin = login === 'admin';
    const authorities = isSuperAdmin ? ['FULL_PERMISSION'] : [];
    const account = new Account(true, authorities, email, fullName, 'vi', null, login, null, [], null);
    this.accountService.authenticate(account);
    return account;
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

  private toRegisterException(err: HttpErrorResponse): LoginException {
    const errorCode = err.error?.errorCode;
    if (errorCode === 'USER_EXISTED') {
      return new LoginException('INVALID_CREDENTIALS', 'Email hoặc số điện thoại đã được đăng ký.');
    }
    return new LoginException('UNKNOWN', err.error?.message || 'Đăng ký thất bại, vui lòng thử lại.');
  }
}
