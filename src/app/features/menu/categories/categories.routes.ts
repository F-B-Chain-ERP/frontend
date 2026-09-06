import { Routes } from '@angular/router';

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./category-list.component').then(m => m.CategoryListComponent),
    title: 'Danh mục',
    data: {
      breadcrumb: 'Danh mục',
      breadcrumbIcon: 'appstore',
    },
  },
];

export default CATEGORIES_ROUTES;
