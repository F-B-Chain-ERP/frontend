import { Routes } from '@angular/router';

export const MATERIALS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./material-list.component').then(m => m.MaterialListComponent),
    title: 'Quản lý nguyên vật liệu',
    data: {
      breadcrumb: 'Nguyên vật liệu',
      breadcrumbIcon: 'inbox',
    },
  },
];

export default MATERIALS_ROUTES;
