import {Routes} from '@angular/router';
import {StoreDailyReportListComponent} from './daily-report-list.component';

export default [
  {
    path: '',
    component: StoreDailyReportListComponent,
    title: 'Báo cáo ngày cửa hàng',
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
] as Routes;
