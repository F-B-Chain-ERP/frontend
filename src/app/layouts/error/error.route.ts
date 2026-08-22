import {Routes} from '@angular/router';

export const errorRoute: Routes = [
  {
    path: 'error',
    loadComponent: () => import('./error.component'),
    data: {
      errorCode: '500',
      title: 'Hệ thống gặp sự cố',
      description: 'Đã có lỗi xảy ra trong quá trình xử lý yêu cầu. Vui lòng tải lại trang hoặc thử lại sau.',
    },
    title: '500 - Lỗi hệ thống',
  },
  {
    path: 'accessdenied',
    loadComponent: () => import('./error.component'),
    data: {
      errorCode: '403',
      title: 'Truy cập bị từ chối',
      description: 'Bạn không có quyền hạn truy cập vào tài nguyên này. Vui lòng liên hệ quản trị viên để được cấp quyền.',
    },
    title: '403 - Không có quyền truy cập',
  },
  {
    path: '404',
    loadComponent: () => import('./error.component'),
    data: {
      errorCode: '404',
      title: 'Không tìm thấy trang',
      description: 'Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang địa chỉ khác.',
    },
    title: '404 - Không tìm thấy trang',
  },
];
