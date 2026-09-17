import {Routes} from '@angular/router';

export const PICKUP_SLOTS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./pickup-slot-list.component').then(m => m.PickupSlotListComponent),
    title: 'Quản lý khung giờ Pickup',
    data: {
      breadcrumb: 'Khung giờ Pickup',
      breadcrumbIcon: 'field-time',
    },
  },
];

export default PICKUP_SLOTS_ROUTES;
