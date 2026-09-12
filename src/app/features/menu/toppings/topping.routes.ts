import { Routes } from '@angular/router';

export const TOPPING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./topping-list.component').then(m => m.ToppingListComponent),
    title: 'Quản lý Topping',
    data: {
      breadcrumb: 'Topping',
      breadcrumbIcon: 'coffee',
    },
  },
  {
    path: 'assign',
    loadComponent: () => import('./product-topping-list.component').then(m => m.ProductToppingListComponent),
    title: 'Gán Topping cho Sản phẩm',
    data: {
      breadcrumb: 'Gán Topping',
      breadcrumbIcon: 'link',
    },
  },
];

export default TOPPING_ROUTES;
