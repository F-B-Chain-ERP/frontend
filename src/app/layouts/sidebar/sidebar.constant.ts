import { SidebarGroup } from './sidebar.model';
import { ROLE } from '../../core/config/functions.constants';

export const SIDEBAR_MENU: SidebarGroup[] = [
  {
    kind: 'group',
    id: 'main-menu',
    title: 'MAIN MENU',
    items: [
      {
        kind: 'parent',
        id: 'overview',
        title: 'Tổng quan',
        icon: 'home',
        route: '/home',
        children: [],
      },
      {
        kind: 'parent',
        id: 'store',
        title: 'Cửa hàng & Bán hàng',
        icon: 'shop',
        route: '/store',
        children: [],
      },
      {
        kind: 'parent',
        id: 'ui-kit',
        title: 'UI Design System',
        icon: 'sketch',
        route: '/ui-kit',
        children: [],
      },
      {
        kind: 'parent',
        id: 'error-pages',
        title: 'Trang thông báo lỗi',
        icon: 'warning',
        route: '/error-pages',
        children: [],
      },
      {
        kind: 'parent',
        id: 'system',
        title: 'Hệ thống',
        icon: 'appstore',
        children: [
          {
            kind: 'child',
            id: 'manage-accounts',
            title: 'Quản lý tài khoản',
            route: '/system/accounts/list',
            activePrefix: '/system/accounts',
            authorities: [ROLE.QUAN_LY_NGUOI_DUNG.VIEW],
          },
          {
            kind: 'child',
            id: 'manage-roles',
            title: 'Quản lý vai trò',
            route: '/system/roles/list',
            activePrefix: '/system/roles',
            authorities: [ROLE.QUAN_LY_VAI_TRO.VIEW],
          },
        ],
      },
    ],
  },
];
