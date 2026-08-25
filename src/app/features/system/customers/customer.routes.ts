import {Routes} from '@angular/router';

export const CUSTOMER_ROUTES: Routes = [
  {path: '', redirectTo: 'list', pathMatch: 'full'},
  {path: 'list',
    loadComponent: () => import('./customer-list.component')
      .then(m => m.CustomerListComponent),
    title: 'Quản lý khách hàng',
    data: {breadcrumb: 'Quản lý khách hàng', breadcrumbIcon: 'team'},
  },
];

export default CUSTOMER_ROUTES;
