import { Routes } from '@angular/router';

export const BRANCH_HOURS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./branch-hours.component').then(m => m.BranchHoursComponent),
    title: 'Giờ hoạt động chi nhánh',
    data: {
      breadcrumb: 'Giờ hoạt động',
      breadcrumbIcon: 'clock-circle',
    },
  },
];

export default BRANCH_HOURS_ROUTES;
