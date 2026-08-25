import { Routes } from '@angular/router';

export const BRANCH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./branch-list.component').then(m => m.BranchListComponent),
    title: 'Quản lý chi nhánh',
    data: {
      breadcrumb: 'Quản lý chi nhánh',
      breadcrumbIcon: 'shop',
    },
  },
];

export default BRANCH_ROUTES;
