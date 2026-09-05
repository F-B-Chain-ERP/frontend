import { Routes } from '@angular/router';
import { ShiftListComponent } from './shift-list.component';

export default [
  {
    path: '',
    component: ShiftListComponent,
    title: 'Bàn giao ca & Đối soát tiền két',
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
] as Routes;
