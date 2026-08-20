import { Routes } from '@angular/router';

export const errorRoute: Routes = [
  {
    path: 'error',
    loadComponent: () => import('./error.component'),
    title: 'Lỗi',
  },
  {
    path: 'accessdenied',
    loadComponent: () => import('./error.component'),
    data: {
      errorMessage: 'Bạn không có quyền truy cập trang này.',
    },
    title: 'Không có quyền truy cập',
  },
  {
    path: '404',
    loadComponent: () => import('./error.component'),
    data: {
      errorMessage: 'Trang không tồn tại.',
    },
    title: 'Không tìm thấy trang',
  },
];
