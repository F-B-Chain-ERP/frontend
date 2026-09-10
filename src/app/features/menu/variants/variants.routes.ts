import {Routes} from '@angular/router';

export const VARIANTS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./variant-list.component').then(m => m.VariantListComponent),
    title: 'Biến thể sản phẩm',
    data: {
      breadcrumb: 'Biến thể',
      breadcrumbIcon: 'appstore',
    },
  },
];

export default VARIANTS_ROUTES;
