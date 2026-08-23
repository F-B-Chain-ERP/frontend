import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';

import { StateStorageService } from './state-storage.service';
import {
  ApiResponse,
  AuthResponse,
  GoogleOAuth2Request,
  LoginCredentials,
  LoginRequest,
  PrincipalType,
  RegisterCustomerRequest,
  VerifyOtpRequest,
} from '../../features/login/login.model';
import { ApplicationConfigService } from '../config/application-config.service';

@Injectable({ providedIn: 'root' })
export class AuthServerProvider {
  private readonly http = inject(HttpClient);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  login(credentials: LoginCredentials, type: PrincipalType = 'ACCOUNT'): Observable<ApiResponse<AuthResponse>> {
    const body: LoginRequest = {
      usernameOrEmail: credentials.username.trim(),
      password: credentials.password,
      type,
    };
    return this.http.post<ApiResponse<AuthResponse>>(this.applicationConfigService.getEndpointFor('api/v1/auth/login'), body);
  }

  registerCustomer(request: RegisterCustomerRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(this.applicationConfigService.getEndpointFor('api/v1/auth/register'), request);
  }

  loginWithGoogle(idToken: string): Observable<ApiResponse<AuthResponse>> {
    const body: GoogleOAuth2Request = { idToken };
    return this.http.post<ApiResponse<AuthResponse>>(this.applicationConfigService.getEndpointFor('api/v1/auth/oauth2/google'), body);
  }

  verifyEmail(request: VerifyOtpRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(this.applicationConfigService.getEndpointFor('api/v1/auth/verify-email'), request);
  }

  refreshToken(refreshToken: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(this.applicationConfigService.getEndpointFor('api/v1/auth/refresh-token'), {
      refreshToken,
    });
  }

  logout(): Observable<void> {
    const refreshToken = this.stateStorageService.getRefreshToken();
    const body = refreshToken ? { refreshToken } : {};
    return this.http
      .post<void>(this.applicationConfigService.getEndpointFor('api/v1/auth/logout'), body)
      .pipe(finalize(() => this.stateStorageService.clearAuthenticationToken()));
  }
}
