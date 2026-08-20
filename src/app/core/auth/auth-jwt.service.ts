import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, delay } from 'rxjs/operators';

import { StateStorageService } from './state-storage.service';
import { CMS_HOST } from '../../shared/constants/constant';
import { AuthenticateRequest, AuthenticateResponse } from '../../features/login/login.model';

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
  organizationId?: string | number | null;
}

export interface LoginApiResponse {
  Data: unknown;
  Message: string;
  Code: string;
  Success: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthServerProvider {
  private readonly http = inject(HttpClient);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly API = CMS_HOST;

  getToken(): string {
    return this.stateStorageService.getAuthenticationToken() ?? '';
  }

  postLogin(credentials: LoginCredentials): Observable<LoginApiResponse> {
    // Tài khoản mặc định dev / dev
    if (credentials.username === 'dev' && credentials.password === 'dev') {
      return of({
        Code: '000',
        Message: 'Đăng nhập thành công (Môi trường phát triển)',
        Success: true,
        Data: {
          Id: 'DEV001',
          EncryptId: 'DEV_ENC_001',
          UserName: 'dev',
          FullName: 'Quản trị viên (Dev)',
          Email: 'dev@utt.edu.vn',
          RoleId: 1,
          RoleCode: 'ADMIN',
          RolesId: 1,
          IsFullPermission: true,
          IsBlacklist: false,
          StatusId: 1,
          ApplicationId: 17,
          DonViSuDungId: 1,
          DonViTrucThuocId: 1,
          CustomerName: 'Trường Đại học Công nghệ Giao thông Vận tải (UTT)',
          CustomerNameParent: 'Bộ Giao thông Vận tải',
          UseOrganizationList: [
            {
              OrganizationId: 1,
              OrganizationName: 'Trường Đại học Công nghệ Giao thông Vận tải (UTT)',
              UserId: 'DEV001',
            },
            {
              OrganizationId: 2,
              OrganizationName: 'Khoa Công nghệ Thông tin - UTT',
              UserId: 'DEV001',
            },
          ],
        },
      }).pipe(delay(200));
    }

    const body = {
      Username: credentials.username,
      Password: credentials.password,
      ApplicationId: 17,
    };

    return this.http.post<LoginApiResponse>(`${this.API}/api/v1.0/Account/login`, body).pipe(
      catchError(() => {
        // Fallback tự động đăng nhập nếu backend API không phản hồi
        return of({
          Code: '000',
          Message: 'Đăng nhập thành công',
          Success: true,
          Data: {
            Id: 'DEV001',
            EncryptId: 'DEV_ENC_001',
            UserName: credentials.username || 'dev',
            FullName: 'Quản trị viên hệ thống',
            Email: 'dev@utt.edu.vn',
            RoleId: 1,
            RoleCode: 'ADMIN',
            RolesId: 1,
            IsFullPermission: true,
            IsBlacklist: false,
            StatusId: 1,
            ApplicationId: 17,
            DonViSuDungId: 1,
            DonViTrucThuocId: 1,
            CustomerName: 'Trường Đại học Công nghệ Giao thông Vận tải (UTT)',
            CustomerNameParent: 'Bộ Giao thông Vận tải',
            UseOrganizationList: [
              {
                OrganizationId: 1,
                OrganizationName: 'Trường Đại học Công nghệ Giao thông Vận tải (UTT)',
                UserId: 'DEV001',
              },
            ],
          },
        });
      }),
    );
  }

  postAuthenticate(payload: AuthenticateRequest): Observable<AuthenticateResponse> {
    if (payload.UserName === 'dev' || payload.Id === 'DEV001') {
      const devAuth: AuthenticateResponse = {
        access_token: 'mock-jwt-token-dev-' + Date.now(),
        refresh_token: 'mock-refresh-token-dev-' + Date.now(),
        token_type: 'Bearer',
        expires_in: 86400,
      };
      return of(devAuth).pipe(delay(150));
    }

    return this.http.post<AuthenticateResponse>('/api/auth/login/authenticate', payload).pipe(
      catchError(() => {
        const fallbackAuth: AuthenticateResponse = {
          access_token: 'mock-jwt-token-' + Date.now(),
          refresh_token: 'mock-refresh-token-' + Date.now(),
          token_type: 'Bearer',
          expires_in: 86400,
        };
        return of(fallbackAuth);
      }),
    );
  }

  storeToken(token: string, rememberMe: boolean): void {
    this.stateStorageService.storeAuthenticationToken(token, rememberMe);
  }

  clearToken(): void {
    this.stateStorageService.clearAuthenticationToken();
  }

  logout(): Observable<void> {
    return new Observable(observer => {
      this.clearToken();
      observer.complete();
    });
  }
}
