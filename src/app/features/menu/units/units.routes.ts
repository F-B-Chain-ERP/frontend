import { Routes } from '@angular/router';

export const UNITS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./unit-list.component').then(m => m.UnitListComponent),
    title: 'Đơn vị tính',
    data: {
      breadcrumb: 'Đơn vị tính',
      breadcrumbIcon: 'appstore',
    },
  },
];

export default UNITS_ROUTES;
