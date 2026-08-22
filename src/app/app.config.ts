import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {ApplicationConfig, LOCALE_ID, importProvidersFrom, inject, provideAppInitializer} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {
  NavigationError,
  Router,
  RouterFeatures,
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withNavigationErrorHandler,
} from '@angular/router';

import {authExpiredInterceptor} from './core/interceptor/auth-expired.interceptor';
import {authInterceptor} from './core/interceptor/auth.interceptor';
import {errorHandlerInterceptor} from './core/interceptor/error-handler.interceptor';
import {notificationInterceptor} from './core/interceptor/notification.interceptor';

import {AppPageTitleStrategy} from './app-page-title-strategy';
import {routes} from './app.routes';
import {ApplicationConfigService} from './core/config/application-config.service';
import {provideNzI18n, vi_VN} from 'ng-zorro-antd/i18n';
import {NzModalModule} from 'ng-zorro-antd/modal';

const routerFeatures: RouterFeatures[] = [
  withComponentInputBinding(),
  withNavigationErrorHandler((e: NavigationError) => {
    const router = inject(Router);
    const errorStatus = (e.error as { status?: number })?.status;
    if (errorStatus === 403) {
      router.navigate(['/accessdenied']);
    } else if (errorStatus === 404) {
      router.navigate(['/404']);
    } else if (errorStatus === 401) {
      router.navigate(['/login']);
    } else {
      router.navigate(['/error']);
    }
  }),
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, ...routerFeatures),
    provideAppInitializer(() => {
      inject(ApplicationConfigService).setEndpointPrefix(SERVER_API_URL);
    }),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        authExpiredInterceptor,
        errorHandlerInterceptor,
        notificationInterceptor,
      ]),
    ),
    Title,
    provideNzI18n(vi_VN),
    importProvidersFrom(NzModalModule),
    {provide: LOCALE_ID, useValue: 'vi'},
    {provide: TitleStrategy, useClass: AppPageTitleStrategy},
  ],
};
