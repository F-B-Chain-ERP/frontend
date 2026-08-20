import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { errorRoute } from './layouts/error/error.route';
import MainComponent from './layouts/main/main.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login'),
    title: 'Đăng nhập',
  },
  {
    path: '',
    component: MainComponent,
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home'),
        canActivate: [AuthGuard],
        title: 'Trang chủ',
      },
      {
        path: 'ui-kit',
        loadComponent: () => import('./features/ui-kit/ui-kit.component'),
        title: 'UI Design System Showcase',
      },
      {
        path: 'system/accounts',
        loadChildren: () => import('./features/system/users/users.routes'),
      },
      {
        path: 'store',
        loadChildren: () => import('./features/store/store.routes'),
      },
      {
        path: 'error-pages',
        loadChildren: () => import('./features/error-pages/error-pages.routes'),
      },
      {
        path: 'users',
        redirectTo: 'system/accounts/list',
        pathMatch: 'full',
      },
      ...errorRoute,
    ],
  },
  {
    path: '**',
    redirectTo: '404',
  },
];

export default routes;
