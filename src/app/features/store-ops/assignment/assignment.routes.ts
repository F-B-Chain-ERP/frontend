import { Routes } from '@angular/router';
import { ShiftAssignmentListComponent } from './assignment-list.component';

export default [
  {
    path: '',
    component: ShiftAssignmentListComponent,
    title: 'Phân ca làm việc',
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
] as Routes;
