import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';

import {StateStorageService} from './state-storage.service';
import {ApiResponse, AuthResponse, LoginCredentials, LoginRequest} from '../../features/login/login.model';
import {ApplicationConfigService} from '../config/application-config.service';

@Injectable({providedIn: 'root'})
export class AuthServerProvider {
  private readonly http = inject(HttpClient);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  login(credentials: LoginCredentials): Observable<ApiResponse<AuthResponse>> {
    const body: LoginRequest = {
      usernameOrEmail: credentials.username.trim(),
      password: credentials.password,
    };
    return this.http.post<ApiResponse<AuthResponse>>(
      this.applicationConfigService.getEndpointFor('api/v1/auth/login'),
      body,
    );
  }

  refreshToken(refreshToken: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(
      this.applicationConfigService.getEndpointFor('api/v1/auth/refresh-token'),
      {refreshToken},
    );
  }

  logout(): Observable<void> {
    return new Observable(observer => {
      this.http.post<void>(this.applicationConfigService.getEndpointFor('api/v1/auth/logout'), {}).subscribe({
        next: () => {
          this.stateStorageService.clearAuthenticationToken();
          observer.next();
          observer.complete();
        },
        error: () => {
          this.stateStorageService.clearAuthenticationToken();
          observer.next();
          observer.complete();
        },
      });
    });
  }
}
