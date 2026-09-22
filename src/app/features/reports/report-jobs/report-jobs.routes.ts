import { Routes } from '@angular/router';

export const REPORT_JOBS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./report-jobs.component').then(m => m.ReportJobsComponent),
    title: 'Trung tâm tác vụ báo cáo',
    data: {
      breadcrumb: 'Tác vụ xuất báo cáo',
      breadcrumbIcon: 'cloud-download',
    },
  },
];

export default REPORT_JOBS_ROUTES;
