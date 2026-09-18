import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AppNotificationService } from '../../shared/app-notification/app-notification.service';
import { EventManager, EventWithContent } from '../util/event-manager.service';

export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
  const eventManager = inject(EventManager);
  const toast = inject(AppNotificationService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 403) {
        toast.error('Không có quyền thực hiện thao tác này.');
      } else if (err.status === 401) {
        // auth-expired interceptor xử lý refresh token, không toast ở đây
      } else if (err.status >= 500) {
        toast.error('Lỗi hệ thống, vui lòng thử lại sau.');
      }

      if (!(err.status === 401 && (err.message === '' || err.url?.includes('api/account')))) {
        eventManager.broadcast(new EventWithContent('app.httpError', err));
      }

      return throwError(() => err);
    }),
  );
};

export const errorInterceptor = errorHandlerInterceptor;

