import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: 'cart',
    loadComponent: () => import('./cart/cart.component'),
    title: 'Giỏ hàng',
  },
  {
    path: 'checkout',
    loadComponent: () => import('./checkout/checkout.component'),
    title: 'Thanh toán',
  },
  {
    path: '',
    loadComponent: () => import('./store.component'),
    title: 'Cửa hàng & Bán hàng trực tuyến',
  },
  {
    path: 'settings',
    loadComponent: () => import('../account/settings/settings.component'),
    title: 'Cài đặt tài khoản',
  },
  {
    path: 'change-password',
    redirectTo: 'settings',
    pathMatch: 'full',
  },
];

export default routes;
