import { Routes } from '@angular/router';

export const PURCHASE_ORDERS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./po-list.component').then(m => m.PurchaseOrderListComponent),
    title: 'Quản lý đơn mua hàng',
    data: {
      breadcrumb: 'Đơn mua hàng',
      breadcrumbIcon: 'file-text',
    },
  },
];

export default PURCHASE_ORDERS_ROUTES;
