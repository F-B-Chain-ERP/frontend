import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { EMPTY, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { StateStorageService } from '../auth/state-storage.service';
import { AuthServerProvider } from '../auth/auth-jwt.service';
import { LoginService } from '../../features/login/login.service';

export const authExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const stateStorageService = inject(StateStorageService);
  const authServerProvider = inject(AuthServerProvider);
  const loginService = inject(LoginService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !error.url) {
        return throwError(() => error);
      }
      if (error.url.includes('api/v1/auth/login') || error.url.includes('api/v1/auth/refresh-token')) {
        return throwError(() => error);
      }

      const refreshToken = stateStorageService.getRefreshToken();
      if (!refreshToken) {
        loginService.logout().subscribe();
        return throwError(() => error);
      }

      return authServerProvider.refreshToken(refreshToken).pipe(
        switchMap(res => {
          const auth = res.data;
          stateStorageService.storeAuthenticationToken(auth.accessToken, true);
          stateStorageService.storeRefreshToken(auth.refreshToken, true);
          const retried = req.clone({
            setHeaders: { Authorization: `Bearer ${auth.accessToken}` },
          });
          return next(retried);
        }),
        catchError(() => {
          loginService.logout().subscribe();
          return throwError(() => error);
        }),
      );
    }),
  );
};
