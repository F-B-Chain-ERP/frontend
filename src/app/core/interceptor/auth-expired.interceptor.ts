import { HttpInterceptorFn } from '@angular/common/http';

export const authExpiredInterceptor: HttpInterceptorFn = (req, next) => next(req);
