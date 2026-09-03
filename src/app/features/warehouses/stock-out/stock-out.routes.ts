import { Routes } from '@angular/router';

export const STOCK_OUT_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./stock-out-list.component').then(m => m.StockOutListComponent),
    title: 'Quản lý phiếu xuất kho',
    data: {
      breadcrumb: 'Xuất kho',
      breadcrumbIcon: 'inbox',
    },
  },
];

export default STOCK_OUT_ROUTES;
