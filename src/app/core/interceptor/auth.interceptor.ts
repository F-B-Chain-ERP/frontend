import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {EMPTY, catchError, throwError} from 'rxjs';

import {StateStorageService} from '../auth/state-storage.service';
import {ApplicationConfigService} from '../config/application-config.service';
import {LoginService} from '../../features/login/login.service';

const EXTERNAL_API_PATH_PREFIXES = ['/api/v1.0/Category'];

function isExternalApiRequest(url: string): boolean {
  return EXTERNAL_API_PATH_PREFIXES.some(prefix => url.startsWith(prefix));
}

function isPublicApiRequest(url: string, method: string): boolean {
  if (url.includes('api/v1/auth/')) return true;
  if (url.includes('api/v1/sales/')) return true;
  // Cho phép kênh bán hàng đọc danh mục và sản phẩm công khai mà không bắt buộc đăng nhập
  if (method === 'GET' && (url.includes('api/v1/menu/categories') || url.includes('api/v1/menu/products'))) {
    return true;
  }
  return false;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const stateStorageService = inject(StateStorageService);
  const applicationConfigService = inject(ApplicationConfigService);
  const loginService = inject(LoginService);

  const serverApiUrl = applicationConfigService.getEndpointFor('');

  if (!req.url || (req.url.startsWith('http') && !(serverApiUrl && req.url.startsWith(serverApiUrl)))) {
    return next(req);
  }
  if (isExternalApiRequest(req.url)) {
    return next(req);
  }
  const isPublic = isPublicApiRequest(req.url, req.method);
  const token = stateStorageService.getAuthenticationToken();

  if (!token && !isPublic) {
    loginService.logout().subscribe();
    return EMPTY;
  }

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublic) {
        loginService.logout().subscribe();
      }
      return throwError(() => error);
    }),
  );
};
