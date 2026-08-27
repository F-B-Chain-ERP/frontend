import { Routes } from '@angular/router';

export const SUPPLIER_MATERIALS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./supplier-material-list.component').then(m => m.SupplierMaterialListComponent),
    title: 'Bảng giá nguyên vật liệu',
    data: {
      breadcrumb: 'Bảng giá nguyên vật liệu',
      breadcrumbIcon: 'tags',
    },
  },
];

export default SUPPLIER_MATERIALS_ROUTES;
