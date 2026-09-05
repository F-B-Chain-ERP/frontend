export type WarehouseType = 'BRANCH' | 'CENTRAL' | 'VIRTUAL';
export type WarehouseStatus = 'ACTIVE' | 'INACTIVE';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  warehouseType: WarehouseType | string;
  branchId?: string | null;
  branchName?: string | null;
  address?: string | null;
  status: WarehouseStatus | string;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface WarehouseFilter {
  query?: string;
  branchId?: string | null;
  warehouseType?: string | null;
  status?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface WarehouseListResponse {
  items: Warehouse[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const WAREHOUSE_TYPE_OPTIONS = [
  { label: 'Kho chi nhánh (BRANCH)', value: 'BRANCH' },
  { label: 'Kho tổng (CENTRAL)', value: 'CENTRAL' },
  { label: 'Kho ảo (VIRTUAL)', value: 'VIRTUAL' },
];

export const WAREHOUSE_STATUS_OPTIONS = [
  { label: 'Đang hoạt động', value: 'ACTIVE' },
  { label: 'Ngừng hoạt động', value: 'INACTIVE' },
];

export function getWarehouseStatusMeta(status?: string | null): {
  label: string;
  badgeClass: string;
} {
  const s = String(status || '').toUpperCase();
  if (s === 'ACTIVE' || s === '1' || s === 'HOAT_DONG') {
    return { label: 'Đang hoạt động', badgeClass: 'tbl-badge tbl-badge--success' };
  }
  return { label: 'Ngừng hoạt động', badgeClass: 'tbl-badge tbl-badge--danger' };
}


export function getWarehouseTypeMeta(type?: string | null): {
  label: string;
  color: string;
  icon: string;
} {
  switch (type?.toUpperCase()) {
    case 'CENTRAL':
      return { label: 'Kho tổng', color: 'purple', icon: 'appstore' };
    case 'BRANCH':
      return { label: 'Kho chi nhánh', color: 'blue', icon: 'shop' };
    case 'VIRTUAL':
      return { label: 'Kho ảo', color: 'cyan', icon: 'cloud' };
    default:
      return { label: type || 'Khác', color: 'default', icon: 'inbox' };
  }
}
