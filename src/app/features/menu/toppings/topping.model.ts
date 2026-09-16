// ── Topping ─────────────────────────────────────────────────────────────

export interface Topping {
  id: string;
  code: string;
  name: string;
  price: number;
  imageUrl: string | null;
  groupName: string | null;
  materialId: string | null;
  materialQuantity: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToppingFilter {
  search?: string;
  groupName?: string;
  status?: string | null;
  page: number;
  size: number;
}

export interface CreateToppingRequest {
  code: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  groupName?: string | null;
  materialId?: string | null;
  materialQuantity?: number | null;
}

export interface UpdateToppingRequest {
  code: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  groupName?: string | null;
  materialId?: string | null;
  materialQuantity?: number | null;
  status?: string;
}

export interface ToppingListResponse {
  items: Topping[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const TOPPING_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang bán' },
  { value: 'INACTIVE', label: 'Tạm ngưng' },
];

export function getToppingStatusMeta(status: string): { label: string; badgeClass: string } {
  if (String(status || '').toUpperCase() === 'ACTIVE') {
    return { label: 'Đang bán', badgeClass: 'tbl-badge tbl-badge--success' };
  }
  return { label: 'Tạm ngưng', badgeClass: 'tbl-badge tbl-badge--danger' };
}
