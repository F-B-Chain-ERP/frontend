import { Routes } from '@angular/router';

export const SCOPE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./scope-list.component').then(m => m.ScopeListComponent),
    title: 'Quản lý phạm vi truy cập',
    data: {
      breadcrumb: 'Quản lý phạm vi',
      breadcrumbIcon: 'apartment',
    },
  },
];

export default SCOPE_ROUTES;
