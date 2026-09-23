import { Routes } from '@angular/router';
import { PaymentListComponent } from './payment-list.component';

export default [
  {
    path: '',
    component: PaymentListComponent,
    title: 'Thanh toán',
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
] as Routes;
