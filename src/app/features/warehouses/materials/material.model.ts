/**
 * Material Model & Constants
 * Quản lý Nguyên vật liệu (Kho & Lưu kho)
 */

export interface Material {
  id: string;
  code: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string;
  baseUnitId?: string | null;
  baseUnitName?: string;
  minStockAlert: number;
  isPerishable: boolean;
  status: 'ACTIVE' | 'INACTIVE' | string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaterialFilter {
  query?: string;
  status?: string | null;
  categoryId?: string | null;
  isPerishable?: boolean | null;
  pageIndex: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend' | null;
}

export interface MaterialListResponse {
  items: Material[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface MaterialOption {
  label: string;
  value: string;
}

/** Danh sách tùy chọn nhóm danh mục nguyên vật liệu */
export const MATERIAL_CATEGORY_OPTIONS: MaterialOption[] = [
  { value: 'cat-001', label: 'Sữa & Chế phẩm bơ sữa' },
  { value: 'cat-002', label: 'Trà & Cà phê' },
  { value: 'cat-003', label: 'Đường, Siro & Gia vị' },
  { value: 'cat-004', label: 'Topping & Bột pha chế' },
  { value: 'cat-005', label: 'Bao bì & Đóng gói' },
];

/** Danh sách tùy chọn đơn vị tính cơ bản */
export const MATERIAL_BASE_UNIT_OPTIONS: MaterialOption[] = [
  { value: 'unit-001', label: 'Lít (L)' },
  { value: 'unit-002', label: 'Kilogram (kg)' },
  { value: 'unit-003', label: 'Hộp (Hộp)' },
  { value: 'unit-004', label: 'Gói (Gói)' },
  { value: 'unit-005', label: 'Thùng (Thùng)' },
  { value: 'unit-006', label: 'Chai (Chai)' },
];

/** Tùy chọn trạng thái nguyên vật liệu */
export const MATERIAL_STATUS_OPTIONS = [
  { value: null, label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang sử dụng', badgeClass: 'tbl-badge--success' },
  { value: 'INACTIVE', label: 'Ngừng sử dụng', badgeClass: 'tbl-badge--danger' },
];

/** Tùy chọn phân loại hàng dễ hỏng */
export const MATERIAL_PERISHABLE_OPTIONS = [
  { value: null, label: 'Tất cả' },
  { value: true, label: 'Dễ hỏng (Hạn ngắn)' },
  { value: false, label: 'Bảo quản thường' },
];

export function getMaterialStatusMeta(status: string): { label: string; badgeClass: string } {
  const s = String(status || '').toUpperCase();
  if (s === 'ACTIVE' || s === '1' || s === 'HOAT_DONG') {
    return { label: 'Đang sử dụng', badgeClass: 'tbl-badge tbl-badge--success' };
  }
  return { label: 'Ngừng sử dụng', badgeClass: 'tbl-badge tbl-badge--danger' };
}

export function getPerishableMeta(isPerishable: boolean): { label: string; badgeClass: string; icon: string } {
  if (isPerishable) {
    return {
      label: 'Dễ hỏng',
      badgeClass: 'tbl-badge tbl-badge--warning',
      icon: 'alert',
    };
  }
  return {
    label: 'Bảo quản thường',
    badgeClass: 'tbl-badge tbl-badge--info',
    icon: 'check',
  };
}
