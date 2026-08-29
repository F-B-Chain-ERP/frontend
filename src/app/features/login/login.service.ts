import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, from, map, of, switchMap, tap, throwError } from 'rxjs';

import { AuthServerProvider } from '../../core/auth/auth-jwt.service';
import { AccountService } from '../../core/auth/account.service';
import { StateStorageService } from '../../core/auth/state-storage.service';
import { ApplicationConfigService } from '../../core/config/application-config.service';
import { Account } from '../../core/auth/account.model';
import { AuthResponse, ForgotPasswordRequest, LoginCredentials, LoginException, PrincipalType, RegisterCustomerRequest, ResendOtpRequest, ResetPasswordOtpRequest, SelectBranchRequest } from './login.model';

import { FULL_PERMISSION } from '../../core/config/functions.constants';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly authServerProvider = inject(AuthServerProvider);
  private readonly accountService = inject(AccountService);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /** Đăng nhập tài khoản nội bộ (admin/nhân viên). Mặc định type = ACCOUNT. */
  login(credentials: LoginCredentials, type: PrincipalType = 'ACCOUNT'): Observable<AuthResponse> {
    return this.authServerProvider.login(credentials, type).pipe(
      map(res => {
        const auth = res.data;
        this.applyAuthResult(auth, credentials.rememberMe);
        this.toAccount(auth, credentials.username);
        this.stateStorageService.setPendingScopeAssignment(auth.requiresScopeAssignment);
        return auth;
      }),
      catchError((err: HttpErrorResponse) => throwError(() => this.toLoginException(err))),
    );
  }

  /** Đăng nhập / đăng ký khách hàng qua Google (gửi Google ID token). */
  loginWithGoogle(idToken: string, rememberMe = true): Observable<AuthResponse> {
    return this.authServerProvider.loginWithGoogle(idToken).pipe(
      map(res => {
        const auth = res.data;
        this.applyAuthResult(auth, rememberMe);
        this.toAccount(auth);
        this.stateStorageService.setPendingScopeAssignment(auth.requiresScopeAssignment);
        return auth;
      }),
      catchError((err: HttpErrorResponse) => throwError(() => this.toLoginException(err))),
    );
  }

  /**
   * Đăng ký khách hàng. Khi email chưa cần xác thực (backend trả access token),
   * tự động lưu token và thiết lập tài khoản. Khi cần OTP, trả về AuthResponse
   * chứa verifyToken để component chuyển sang màn xác thực.
   */
  register(request: RegisterCustomerRequest): Observable<AuthResponse> {
    return this.authServerProvider.registerCustomer(request).pipe(
      map(res => {
        const auth = res.data;
        if (auth.accessToken && auth.refreshToken) {
          this.applyAuthResult(auth, true);
          this.toAccount(auth);
        }
        return auth;
      }),
      catchError((err: HttpErrorResponse) => throwError(() => this.toRegisterException(err))),
    );
  }

  /** Gửi lại mã OTP xác thực email, trả về verifyToken mới. */
  resendOtp(verifyToken: string): Observable<AuthResponse> {
    const request: ResendOtpRequest = { verifyToken };
    return this.authServerProvider.resendOtp(request).pipe(
      map(res => res.data),
      catchError((err: HttpErrorResponse) => throwError(() => this.toRegisterException(err))),
    );
  }

  forgotPassword(email: string, type?: PrincipalType): Observable<AuthResponse> {
    const request: ForgotPasswordRequest = { email: email.trim(), type };
    return this.authServerProvider.forgotPassword(request).pipe(
      map(res => res.data),
      catchError((err: HttpErrorResponse) => throwError(() => this.toForgotPasswordException(err))),
    );
  }

  resetPassword(resetToken: string, otp: string, newPassword: string): Observable<AuthResponse> {
    const request: ResetPasswordOtpRequest = { resetToken, otp, newPassword };
    return this.authServerProvider.resetPassword(request).pipe(
      map(res => {
        const auth = res.data;
        if (auth.accessToken && auth.refreshToken) {
          this.applyAuthResult(auth, true);
          this.toAccount(auth);
          this.stateStorageService.setPendingScopeAssignment(auth.requiresScopeAssignment);
        }
        return auth;
      }),
      catchError((err: HttpErrorResponse) => throwError(() => this.toForgotPasswordException(err))),
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

  /** Chọn đơn vị (chi nhánh) làm việc sau khi đăng nhập, trả về token chứa branchId. */
  selectBranch(branchId: string, rememberMe = true): Observable<AuthResponse> {
    const request: SelectBranchRequest = { branchId };
    return this.authServerProvider.selectBranch(request).pipe(
      map(res => {
        const auth = res.data;
        this.applyAuthResult(auth, rememberMe);
        this.toAccount(auth);
        this.stateStorageService.storeSelectedBranch(branchId);
        this.stateStorageService.setPendingScopeAssignment(false);
        return auth;
      }),
      catchError((err: HttpErrorResponse) => throwError(() => this.toLoginException(err))),
    );
  }

  logout(): Observable<void> {
    return this.authServerProvider.logout().pipe(
      catchError(() => of(null)),
      tap(() => {
        this.accountService.authenticate(null);
        this.stateStorageService.clearSelectedBranch();
        this.stateStorageService.clearPendingScopeAssignment();
      }),
      switchMap(() => from(this.router.navigate(['/login']))),
      map(() => void 0),
    );
  }

  private applyAuthResult(auth: AuthResponse, rememberMe: boolean): void {
    this.stateStorageService.storeAuthenticationToken(auth.accessToken, rememberMe);
    this.stateStorageService.storeRefreshToken(auth.refreshToken, rememberMe);
  }

  private decodeTokenPayload(token: string | null | undefined): Record<string, any> | null {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return null;
    }
  }

  private toAccount(auth: AuthResponse, fallbackLogin = ''): Account {
    const isCustomer = auth.principalType === 'CUSTOMER';
    const customer = auth.customer;
    const decoded = this.decodeTokenPayload(auth.accessToken);
    const tokenUsername = decoded?.['username'] || decoded?.['sub'] || '';
    const defaultLogin = fallbackLogin || tokenUsername;
    const login = isCustomer
      ? (customer?.email ?? customer?.phone ?? defaultLogin)
      : defaultLogin;
    const email = isCustomer ? (customer?.email ?? '') : (decoded?.['email'] ?? '');
    const fullName = isCustomer ? (customer?.fullName ?? null) : null;

    const rawRoles: string[] = Array.isArray(decoded?.['roleCodes']) ? decoded?.['roleCodes'] : [];
    const isSuperAdmin = login === 'admin' || rawRoles.includes('ADMIN') || rawRoles.includes('ROLE_ADMIN');

    const authorities: string[] = [];
    if (isSuperAdmin) {
      authorities.push(FULL_PERMISSION, 'ROLE_ADMIN', 'ADMIN');
    }
    // Giữ mã vai trò (để guard khớp ROLE_*) – quyền chi tiết lấy từ backend
    rawRoles.forEach(r => authorities.push(r.startsWith('ROLE_') ? r : 'ROLE_' + r));

    const account = new Account(true, authorities, email, fullName, 'vi', null, login, null, [], null);
    this.accountService.authenticate(account);
    // Lấy quyền thực (permission code) từ backend thay vì map hardcode
    this.loadMyPermissions(account);
    return account;
  }

  /** Gọi BE lấy permission code thật của user login, gộp vào authorities. */
  private loadMyPermissions(account: Account): void {
    this.http
      .get<{ data: { roles: string[]; permissions: string[]; scopes: unknown[] } }>(
        this.applicationConfigService.getEndpointFor('api/v1/auth/my-permission'),
      )
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (!res?.data?.permissions?.length) {
          return;
        }
        const merged = new Set<string>([...account.authorities, ...res.data.permissions]);
        account.authorities = Array.from(merged);
        this.accountService.authenticate(account);
      });
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

  private toForgotPasswordException(err: HttpErrorResponse): LoginException {
    const msg = err.error?.message as string | undefined;
    const errorCode = err.error?.errorCode as string | undefined;
    if (errorCode === 'USER_NOT_EXISTED') {
      return new LoginException('INVALID_CREDENTIALS', 'Email không tồn tại trong hệ thống.');
    }
    if (msg?.includes('OTP') || errorCode?.includes('OTP')) {
      return new LoginException('INVALID_CREDENTIALS', msg || 'Mã OTP không đúng hoặc đã hết hạn.');
    }
    if (errorCode === 'INVALID_TOKEN' || msg?.includes('token')) {
      return new LoginException('UNKNOWN', 'Phiên đặt lại mật khẩu đã hết hạn, vui lòng gửi lại mã.');
    }
    return new LoginException('UNKNOWN', msg || 'Đã có lỗi xảy ra, vui lòng thử lại.');
  }
}
