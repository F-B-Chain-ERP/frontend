import { Routes } from '@angular/router';
import { FinancialSummaryListComponent } from './financial-summary-list.component';

export default [
  {
    path: '',
    component: FinancialSummaryListComponent,
    title: 'Báo cáo tài chính',
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
] as Routes;
