import { Routes } from '@angular/router';

export const BOM_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./bom-list.component').then((m) => m.BomListComponent),
    title: 'Định lượng pha chế (BOM)',
    data: {
      breadcrumb: 'Định lượng (BOM)',
      breadcrumbIcon: 'experiment',
    },
  },
];

export default BOM_ROUTES;
