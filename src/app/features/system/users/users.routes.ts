import {Routes} from '@angular/router';

export const USER_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./user-list.component').then(m => m.UserListComponent),
    title: 'Quản lý tài khoản người dùng',
    data: {
      breadcrumb: 'Quản lý người dùng',
      breadcrumbIcon: 'team',
    },
  },
];

export default USER_ROUTES;
