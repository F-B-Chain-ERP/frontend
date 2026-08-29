import { Routes } from '@angular/router';
import { UserRouteAccessService } from '../../../core/auth/user-route-access.service';
import { ROLE } from '../../../core/config/functions.constants';

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
      authorities: [ROLE.QUAN_LY_VAI_TRO.VIEW],
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'edit',
    loadComponent: () =>
      import('./edit/role-permission.component').then(m => m.RolePermissionComponent),
    title: 'Phân quyền vai trò',
    data: {
      breadcrumb: 'Phân quyền vai trò',
      breadcrumbIcon: 'key',
      authorities: [ROLE.PHAN_QUYEN_VAI_TRO.UPDATE, ROLE.QUAN_LY_VAI_TRO.UPDATE],
    },
    canActivate: [UserRouteAccessService],
  },
];

export default ROLE_ROUTES;
