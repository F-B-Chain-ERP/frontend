import { Routes } from '@angular/router';

export const ROLE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () =>
      import('./list/role-list.component').then(m => m.RoleListComponent),
    title: 'Quản lý vai trò & Phân quyền',
    data: {
      breadcrumb: 'Quản lý vai trò',
      breadcrumbIcon: 'safety',
    },
  },
  {
    path: 'edit',
    loadComponent: () =>
      import('./edit/role-permission.component').then(m => m.RolePermissionComponent),
    title: 'Phân quyền vai trò',
    data: {
      breadcrumb: 'Phân quyền vai trò',
      breadcrumbIcon: 'key',
    },
  },
];

export default ROLE_ROUTES;
