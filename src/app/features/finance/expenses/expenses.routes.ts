import { Routes } from '@angular/router';
import { ExpenseListComponent } from './expense-list.component';

export default [
  {
    path: '',
    component: ExpenseListComponent,
    title: 'Chi phí vận hành',
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
] as Routes;