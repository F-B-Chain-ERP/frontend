import { Routes } from '@angular/router';
import { PayableListComponent } from './payable-list.component';

export default [
  {
    path: '',
    component: PayableListComponent,
    title: 'Công nợ nhà cung cấp (AP)',
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
] as Routes;
