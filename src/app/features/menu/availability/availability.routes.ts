import {Routes} from '@angular/router';

export const AVAILABILITY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./availability.component').then(m => m.AvailabilityComponent),
    title: 'Khả dụng chi nhánh',
  },
];

export default AVAILABILITY_ROUTES;
