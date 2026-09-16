import { Routes } from '@angular/router';

export const COMBOS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./combo-list.component').then((m) => m.ComboListComponent),
    title: 'Quản lý Combo',
    data: {
      breadcrumb: 'Combo',
      breadcrumbIcon: 'shopping',
    },
  },
];

export default COMBOS_ROUTES;
