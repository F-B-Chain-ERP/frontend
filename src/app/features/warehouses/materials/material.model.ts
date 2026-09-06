/**
 * Material Model & Constants
 * Quản lý Nguyên vật liệu (Kho & Lưu kho)
 */

export interface MaterialCategory {
  id: string;
  name: string;
}

export interface MaterialBaseUnit {
  id: string;
  code: string;
  name: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string;
  category?: MaterialCategory;
  baseUnitId?: string | null;
  baseUnitName?: string;
  unitName?: string;
  baseUnit?: MaterialBaseUnit;
  minStockAlert: number;
  shelfLifeDays?: number | null;
  isPerishable: boolean;
  status: 'ACTIVE' | 'INACTIVE' | string;
  note?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
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
