import { Routes } from '@angular/router';

export const WAREHOUSE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./warehouse-list.component').then(m => m.WarehouseListComponent),
    title: 'Quản lý kho hàng',
    data: {
      breadcrumb: 'Kho hàng',
      breadcrumbIcon: 'inbox',
    },
  },
];

export default WAREHOUSE_ROUTES;
