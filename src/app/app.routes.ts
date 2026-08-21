import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { errorRoute } from './layouts/error/error.route';
import MainComponent from './layouts/main/main.component';
import ClientLayoutComponent from './layouts/client/client-layout.component';

export const routes: Routes = [
  // ── 1. Authentication (No Layout) ──────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./features/login/login'),
    title: 'Đăng nhập',
  },

  // ── 2. Client Storefront (Client Layout, Public Access) ─────
  {
    path: '',
    redirectTo: 'store',
    pathMatch: 'full',
  },
  {
    path: 'store',
    component: ClientLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./features/store/store.routes'),
      },
    ],
  },

  // ── 3. Admin ERP Dashboard (Admin Layout, Protected) ────────
  {
    path: 'admin',
    component: MainComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home'),
        title: 'Trang chủ Quản trị',
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

  // ── 4. Backward-Compatible Fallback Redirects ──────────────
  {
    path: 'home',
    redirectTo: 'admin/home',
    pathMatch: 'full',
  },
  {
    path: 'ui-kit',
    redirectTo: 'admin/ui-kit',
    pathMatch: 'full',
  },
  {
    path: 'system/accounts/list',
    redirectTo: 'admin/system/accounts/list',
    pathMatch: 'full',
  },
  {
    path: 'users',
    redirectTo: 'admin/system/accounts/list',
    pathMatch: 'full',
  },
  {
    path: 'error-pages',
    redirectTo: 'admin/error-pages',
    pathMatch: 'full',
  },

  // ── 5. Wildcard 404 ─────────────────────────────────────────
  {
    path: '**',
    redirectTo: '404',
  },
];

export default routes;
