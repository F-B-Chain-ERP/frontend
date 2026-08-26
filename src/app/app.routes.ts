import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { UserRouteAccessService } from './core/auth/user-route-access.service';
import { ROLE, FULL_PERMISSION } from './core/config/functions.constants';
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
  {
    path: 'register',
    loadComponent: () => import('./features/register/register'),
    title: 'Đăng ký',
  },
  {
    path: 'select-branch',
    loadComponent: () => import('./features/login/select-unit.component'),
    title: 'Chọn đơn vị',
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/login/verify-email.component'),
    title: 'Xác thực email',
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
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [FULL_PERMISSION, 'ROLE_ADMIN'],
        },
      },
      {
        path: 'procurement/purchase-orders',
        loadChildren: () => import('./features/procurement/purchase-orders/purchase-orders.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.DON_MUA_HANG.VIEW],
        },
      },
      {
        path: 'procurement/suppliers',
        loadChildren: () => import('./features/procurement/suppliers/suppliers.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.NHA_CUNG_CAP.VIEW],
        },
      },
      {
        path: 'procurement/supplier-materials',
        loadChildren: () => import('./features/procurement/supplier-materials/supplier-materials.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.BANG_GIA_NCC.VIEW],
        },
      },
      {
        path: 'procurement/supplier',
        redirectTo: 'procurement/suppliers',
        pathMatch: 'prefix',
      },
      {
        path: 'system/accounts',
        loadChildren: () => import('./features/system/users/users.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.QUAN_LY_NGUOI_DUNG.VIEW],
        },
      },
      {
        path: 'system/customers',
        loadChildren: () => import('./features/system/customers/customer.routes'),
      },
      {
        path: 'system/customers/list',
        redirectTo: 'admin/system/customers/list',
        pathMatch: 'full',
      },
      {
        path: 'system/roles',
        loadChildren: () => import('./features/system/roles/roles.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.QUAN_LY_VAI_TRO.VIEW],
        },
      },
      {
        path: 'system/branches',
        loadChildren: () => import('./features/system/branches/branches.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.QUAN_LY_CHI_NHANH.VIEW],
        },
      },
      {
        path: 'system/scopes',
        loadChildren: () => import('./features/system/scopes/scopes.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.QUAN_LY_PHAM_VI.VIEW],
        },
      },
      {
        path: 'error-pages',
        loadChildren: () => import('./features/error-pages/error-pages.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [FULL_PERMISSION, 'ROLE_ADMIN'],
        },
      },
      {
        path: 'users',
        redirectTo: 'system/accounts/list',
        pathMatch: 'full',
      },
      {
        path: 'roles',
        redirectTo: 'system/roles/list',
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
    path: 'procurement/suppliers/list',
    redirectTo: 'admin/procurement/suppliers/list',
    pathMatch: 'full',
  },
  {
    path: 'procurement/supplier-materials/list',
    redirectTo: 'admin/procurement/supplier-materials/list',
    pathMatch: 'full',
  },
  {
    path: 'procurement/supplier/list',
    redirectTo: 'admin/procurement/suppliers/list',
    pathMatch: 'full',
  },
  {
    path: 'system/accounts/list',
    redirectTo: 'admin/system/accounts/list',
    pathMatch: 'full',
  },
  {
    path: 'system/roles/list',
    redirectTo: 'admin/system/roles/list',
    pathMatch: 'full',
  },
  {
    path: 'system/roles/edit',
    redirectTo: 'admin/system/roles/edit',
    pathMatch: 'full',
  },
  {
    path: 'users',
    redirectTo: 'admin/system/accounts/list',
    pathMatch: 'full',
  },
  {
    path: 'roles',
    redirectTo: 'admin/system/roles/list',
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
