import { Routes } from '@angular/router';
import { StockCountListComponent } from './stock-count-list.component';

export default [
  {
    path: '',
    component: StockCountListComponent,
    title: 'Kiểm kê chốt ca & Hao hụt',
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
] as Routes;
