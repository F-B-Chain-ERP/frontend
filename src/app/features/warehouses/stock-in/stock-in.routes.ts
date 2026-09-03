import { Routes } from '@angular/router';

export const STOCK_IN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./stock-in-list.component').then(m => m.StockInListComponent),
    title: 'Quản lý phiếu nhập kho',
    data: {
      breadcrumb: 'Nhập kho',
      breadcrumbIcon: 'inbox',
    },
  },
];

export default STOCK_IN_ROUTES;
