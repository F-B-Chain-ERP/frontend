import { Routes } from '@angular/router';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./product-list.component').then(m => m.ProductListComponent),
    title: 'Sản phẩm',
    data: {
      breadcrumb: 'Sản phẩm',
      breadcrumbIcon: 'coffee',
    },
  },
];

export default PRODUCTS_ROUTES;
