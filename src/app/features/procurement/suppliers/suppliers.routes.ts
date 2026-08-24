import { Routes } from '@angular/router';

export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./supplier-list.component').then(m => m.SupplierListComponent),
    title: 'Quản lý nhà cung cấp',
    data: {
      breadcrumb: 'Nhà cung cấp',
      breadcrumbIcon: 'shopping',
    },
  },
];

export default SUPPLIERS_ROUTES;
