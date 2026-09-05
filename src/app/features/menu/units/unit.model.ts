// ── Unit (đơn vị tính, master dùng chung INV + MENU) ─────────────────────

export interface Unit {
  id: string;
  code: string;
  name: string;
  unitType: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitFilter {
  query?: string;
  unitType?: string | null;
  status?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface CreateUnitRequest {
  code: string;
  name: string;
  unitType: string;
}

export interface UpdateUnitRequest {
  code: string;
  name: string;
  unitType: string;
}

export interface UnitListResponse {
  items: Unit[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const UNIT_TYPE_OPTIONS = [
  { value: 'COUNT', label: 'Đếm số lượng' },
  { value: 'WEIGHT', label: 'Khối lượng' },
  { value: 'VOLUME', label: 'Thể tích' },
];

export const UNIT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang sử dụng', badgeClass: 'tbl-badge--success' },
  { value: 'INACTIVE', label: 'Ngừng sử dụng', badgeClass: 'tbl-badge--danger' },
];

const UNIT_TYPE_LABELS: Record<string, string> = {
  COUNT: 'Đếm số lượng',
  WEIGHT: 'Khối lượng',
  VOLUME: 'Thể tích',
  MASS: 'Khối lượng',
};

export function getUnitTypeLabel(unitType: string): string {
  return UNIT_TYPE_LABELS[String(unitType || '').toUpperCase()] ?? unitType ?? '—';
}

export function getUnitStatusMeta(status: string): { label: string; badgeClass: string } {
  if (String(status || '').toUpperCase() === 'ACTIVE') {
    return { label: 'Đang sử dụng', badgeClass: 'tbl-badge tbl-badge--success' };
  }
  return { label: 'Ngừng sử dụng', badgeClass: 'tbl-badge tbl-badge--danger' };
}
