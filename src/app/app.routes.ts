import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { UserRouteAccessService } from './core/auth/user-route-access.service';
import { ROLE, FULL_PERMISSION } from './core/config/functions.constants';
import { errorRoute } from './layouts/error/error.route';
import MainComponent from './layouts/main/main.component';
import ClientLayoutComponent from './layouts/client/client-layout.component';

export const routes: Routes = [
  // ── 1. Authentication (No Layout) ──────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./features/login/login'),
    title: 'Đăng nhập',
  },
  {
    path: 'register',
    loadComponent: () => import('./features/register/register'),
    title: 'Đăng ký',
  },
  {
    path: 'select-branch',
    loadComponent: () => import('./features/login/select-unit.component'),
    title: 'Chọn đơn vị',
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/login/verify-email.component'),
    title: 'Xác thực email',
  },

  // ── 2. Admin ERP as Default Entrypoint ──────────────────────
  {
    path: '',
    redirectTo: 'admin/home',
    pathMatch: 'full',
  },
  {
    path: 'store',
    component: ClientLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./features/store/store.routes'),
      },
    ],
  },

  // ── 3. Admin ERP Dashboard (Admin Layout, Protected) ────────
  {
    path: 'admin',
    component: MainComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home'),
        title: 'Trang chủ Quản trị',
      },
      {
        path: 'account/settings',
        loadComponent: () => import('./features/account/settings/settings.component'),
        title: 'Cài đặt tài khoản',
      },
      {
        path: 'account/change-password',
        redirectTo: 'account/settings',
        pathMatch: 'full',
      },
      {
        path: 'ui-kit',
        loadComponent: () => import('./features/ui-kit/ui-kit.component'),
        title: 'UI Design System Showcase',
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [FULL_PERMISSION, 'ROLE_ADMIN'],
        },
      },
      {
        path: 'procurement/purchase-orders',
        loadChildren: () => import('./features/procurement/purchase-orders/purchase-orders.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.DON_MUA_HANG.VIEW],
        },
      },
      {
        path: 'procurement/suppliers',
        loadChildren: () => import('./features/procurement/suppliers/suppliers.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.NHA_CUNG_CAP.VIEW],
        },
      },
      {
        path: 'procurement/supplier-materials',
        loadChildren: () => import('./features/procurement/supplier-materials/supplier-materials.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.BANG_GIA_NCC.VIEW],
        },
      },
      {
        path: 'procurement/supplier',
        redirectTo: 'procurement/suppliers',
        pathMatch: 'prefix',
      },
      {
        path: 'system/accounts',
        loadChildren: () => import('./features/system/users/users.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.QUAN_LY_NGUOI_DUNG.VIEW],
        },
      },
      {
        path: 'system/customers',
        loadChildren: () => import('./features/system/customers/customer.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.KHACH_HANG.VIEW],
        },
      },
      {
        path: 'system/customers/list',
        redirectTo: 'admin/system/customers/list',
        pathMatch: 'full',
      },
      {
        path: 'system/roles',
        loadChildren: () => import('./features/system/roles/roles.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.QUAN_LY_VAI_TRO.VIEW],
        },
      },
      {
        path: 'system/branches',
        loadChildren: () => import('./features/system/branches/branches.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.QUAN_LY_CHI_NHANH.VIEW],
        },
      },
      {
        path: 'system/scopes',
        loadChildren: () => import('./features/system/scopes/scopes.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [ROLE.QUAN_LY_PHAM_VI.VIEW],
        },
      },
      // ── POS (trang trắng placeholder) ────────────────
      {
        path: 'pos/orders/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Đơn hàng',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.DON_HANG.VIEW] },
      },
      {
        path: 'pos/deliveries/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Giao hàng',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.GIAO_HANG.VIEW] },
      },
      {
        path: 'pos/kds/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Bếp (KDS)',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.KDS_TICKET.VIEW] },
      },
      {
        path: 'pos/refunds/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Hoàn tiền',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.HOAN_TIEN.VIEW] },
      },
      {
        path: 'pos/payments/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Thanh toán',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.Y_DINH_THANH_TOAN.VIEW] },
      },
      // ── STORE ────────────────────────────────────
      {
        path: 'store/shifts',
        loadChildren: () => import('./features/store-ops/shift/shift.routes'),
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.CA_LAM_VIEC.VIEW] },
      },
      {
        path: 'store/shifts/list',
        redirectTo: 'store/shifts',
        pathMatch: 'full',
      },
      {
        path: 'store/assignments/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Phân ca',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.PHAN_CA.VIEW] },
      },
      {
        path: 'store/reports/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Báo cáo ngày',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.BAO_CAO_NGAY.VIEW] },
      },
      {
        path: 'store/product-stock/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Tồn sản phẩm',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.XEM_TON_SAN_PHAM.VIEW] },
      },
      // ── MENU ─────────────────────────────────────
      {
        path: 'menu/categories/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Danh mục',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.DANH_MUC.VIEW] },
      },
      {
        path: 'menu/products/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Sản phẩm',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.SAN_PHAM.VIEW] },
      },
      {
        path: 'menu/variants/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Biến thể',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.BIEN_THE_SAN_PHAM.VIEW] },
      },
      {
        path: 'menu/toppings/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Topping',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.TOPPING.VIEW] },
      },
      {
        path: 'menu/combos/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Combo',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.COMBO.VIEW] },
      },
      {
        path: 'menu/vouchers/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Voucher',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.VOUCHER.VIEW] },
      },
      {
        path: 'menu/bom',
        loadChildren: () => import('./features/menu/bom/bom.routes'),
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.DINH_LUONG_BOM.VIEW] },
      },
      {
        path: 'menu/bom/list',
        redirectTo: 'menu/bom',
        pathMatch: 'full',
      },
      {
        path: 'menu/availability/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Khả dụng chi nhánh',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.SAN_PHAM_KHA_DUNG.VIEW] },
      },
      // ── INVENTORY ────────────────────────────────
      {
        path: 'inventory/warehouses',
        loadChildren: () => import('./features/warehouses/warehouse-list/warehouse-list.routes'),
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.KHO.VIEW] },
      },
      {
        path: 'inventory/materials',
        loadChildren: () => import('./features/warehouses/materials/materials.routes'),
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.NGUYEN_VAT_LIEU.VIEW] },
      },
      {
        path: 'inventory/balances/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Tồn kho',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.XEM_TON_KHO.VIEW] },
      },
      {
        path: 'inventory/stock-in',
        loadChildren: () => import('./features/warehouses/stock-in/stock-in.routes'),
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.NHAP_KHO.VIEW] },
      },
      {
        path: 'inventory/stock-out',
        loadChildren: () => import('./features/warehouses/stock-out/stock-out.routes'),
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.XUAT_KHO.VIEW] },
      },
      {
        path: 'inventory/transfers/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Chuyển kho',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.CHUYEN_KHO.VIEW] },
      },
      {
        path: 'inventory/counts',
        loadChildren: () => import('./features/warehouses/stock-count/stock-count.routes'),
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.KIEM_KE.VIEW] },
      },
      {
        path: 'inventory/counts/list',
        redirectTo: 'inventory/counts',
        pathMatch: 'full',
      },
      // ── FINANCE ────────────────────────────────
      {
        path: 'finance/payables',
        loadChildren: () => import('./features/finance/payables/payables.routes'),
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.CONG_NO_PHAI_TRA.VIEW] },
      },
      {
        path: 'finance/payables/list',
        redirectTo: 'finance/payables',
        pathMatch: 'full',
      },
      {
        path: 'finance/expenses/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Chi phí',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.CHI_PHI.VIEW] },
      },
      {
        path: 'finance/summaries/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Tổng hợp CN',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.TONG_HOP_TAI_CHINH.VIEW] },
      },
      // ── CUSTOMER ───────────────────────────────
      {
        path: 'customer/loyalty/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Loyalty',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.KHACH_HANG_LOYALTY.VIEW] },
      },
      // ── SYSTEM (bổ sung) ───────────────────────
      {
        path: 'system/branch-hours/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Giờ hoạt động',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.QUAN_LY_GIO_HOAT_DONG.VIEW] },
      },
      {
        path: 'system/pickup-slots/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Khung giờ Pickup',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.QUAN_LY_KHUNG_GIO_PICKUP.VIEW] },
      },
      {
        path: 'system/audit/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Nhật ký hệ thống',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.XEM_AUDIT.VIEW] },
      },
      // ── PLATFORM ───────────────────────────────
      {
        path: 'platform/notifications/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Thông báo',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.THONG_BAO.VIEW] },
      },
      {
        path: 'platform/templates/list',
        loadComponent: () => import('./features/coming-soon/coming-soon.component'),
        title: 'Mẫu thông báo',
        canActivate: [UserRouteAccessService],
        data: { authorities: [ROLE.MAU_THONG_BAO.VIEW] },
      },
      {
        path: 'error-pages',
        loadChildren: () => import('./features/error-pages/error-pages.routes'),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [FULL_PERMISSION, 'ROLE_ADMIN'],
        },
      },
      {
        path: 'users',
        redirectTo: 'system/accounts/list',
        pathMatch: 'full',
      },
      {
        path: 'roles',
        redirectTo: 'system/roles/list',
        pathMatch: 'full',
      },
      ...errorRoute,
    ],
  },

  // ── 4. Backward-Compatible Fallback Redirects ──────────────
  {
    path: 'home',
    redirectTo: 'admin/home',
    pathMatch: 'full',
  },
  {
    path: 'ui-kit',
    redirectTo: 'admin/ui-kit',
    pathMatch: 'full',
  },
  {
    path: 'procurement/suppliers/list',
    redirectTo: 'admin/procurement/suppliers/list',
    pathMatch: 'full',
  },
  {
    path: 'procurement/supplier-materials/list',
    redirectTo: 'admin/procurement/supplier-materials/list',
    pathMatch: 'full',
  },
  {
    path: 'procurement/supplier/list',
    redirectTo: 'admin/procurement/suppliers/list',
    pathMatch: 'full',
  },
  {
    path: 'inventory/warehouses/list',
    redirectTo: 'admin/inventory/warehouses/list',
    pathMatch: 'full',
  },
  {
    path: 'system/accounts/list',
    redirectTo: 'admin/system/accounts/list',
    pathMatch: 'full',
  },
  {
    path: 'system/roles/list',
    redirectTo: 'admin/system/roles/list',
    pathMatch: 'full',
  },
  {
    path: 'system/roles/edit',
    redirectTo: 'admin/system/roles/edit',
    pathMatch: 'full',
  },
  {
    path: 'account/change-password',
    redirectTo: 'admin/account/settings',
    pathMatch: 'full',
  },
  {
    path: 'account/settings',
    redirectTo: 'admin/account/settings',
    pathMatch: 'full',
  },
  {
    path: 'users',
    redirectTo: 'admin/system/accounts/list',
    pathMatch: 'full',
  },
  {
    path: 'roles',
    redirectTo: 'admin/system/roles/list',
    pathMatch: 'full',
  },
  {
    path: 'error-pages',
    redirectTo: 'admin/error-pages',
    pathMatch: 'full',
  },

  // ── 5. Wildcard 404 ─────────────────────────────────────────
  {
    path: '**',
    redirectTo: '404',
  },
];

export default routes;
