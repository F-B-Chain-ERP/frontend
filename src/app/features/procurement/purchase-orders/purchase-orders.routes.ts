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
  {
    path: 'create',
    loadComponent: () => import('./po-form.component').then(m => m.PurchaseOrderFormComponent),
    title: 'Tạo đơn mua hàng',
    data: {
      breadcrumb: 'Tạo đơn mua hàng',
      breadcrumbIcon: 'file-add',
    },
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./po-form.component').then(m => m.PurchaseOrderFormComponent),
    title: 'Cập nhật đơn mua hàng',
    data: {
      breadcrumb: 'Cập nhật đơn mua hàng',
      breadcrumbIcon: 'edit',
    },
  },
];

export default PURCHASE_ORDERS_ROUTES;
