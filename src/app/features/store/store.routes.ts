import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./store.component'),
    title: 'Cửa hàng & Bán hàng trực tuyến',
  },
];

export default routes;
