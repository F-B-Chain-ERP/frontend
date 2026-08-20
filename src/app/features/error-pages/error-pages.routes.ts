import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./error-pages.component'),
    title: 'Trang thông báo lỗi hệ thống',
  },
];

export default routes;
