import { Routes } from '@angular/router';

export const VOUCHERS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./voucher-list.component').then(m => m.VoucherListComponent),
    title: 'Voucher',
    data: {
      breadcrumb: 'Voucher',
      breadcrumbIcon: 'trophy',
    },
  },
];

export default VOUCHERS_ROUTES;
