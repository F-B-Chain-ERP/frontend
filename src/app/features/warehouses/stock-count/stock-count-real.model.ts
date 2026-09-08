/** Phiếu kiểm kê (map từ StockCountResponse của BE). Mock cũ (branch/shift) đã bỏ. */
export type StockCountStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ADJUSTED';

export interface StockCountItem {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  systemQuantity: number | null;
  countedQuantity: number | null;
  varianceQuantity: number | null;
  note: string | null;
}

export interface StockCount {
  id: string;
  code: string;
  warehouseId: string;
  warehouseCode: string | null;
  warehouseName: string | null;
  countDate: string;
  status: StockCountStatus;
  note: string | null;
  items: StockCountItem[];
}

export interface StockCountFilter {
  query?: string;
  status?: string | null;
  warehouseId?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface StockCountListResponse {
  items: StockCount[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface CountItemPayload {
  materialId: string;
  countedQuantity: number;
  note?: string | null;
}

export interface CreateCountPayload {
  warehouseId: string;
  countDate: string;
  note?: string | null;
  items: CountItemPayload[];
}

export const COUNT_STATUS_OPTIONS = [
  { value: null, label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'IN_PROGRESS', label: 'Đang kiểm' },
  { value: 'COMPLETED', label: 'Đã chốt' },
  { value: 'ADJUSTED', label: 'Đã điều chỉnh' },
];

export function getCountStatusMeta(status: StockCountStatus): { label: string; badgeClass: string } {
  switch (status) {
    case 'DRAFT':
      return { label: 'Nháp', badgeClass: 'tbl-badge tbl-badge--neutral' };
    case 'IN_PROGRESS':
      return { label: 'Đang kiểm', badgeClass: 'tbl-badge tbl-badge--info' };
    case 'COMPLETED':
      return { label: 'Đã chốt', badgeClass: 'tbl-badge tbl-badge--warning' };
    case 'ADJUSTED':
      return { label: 'Đã điều chỉnh', badgeClass: 'tbl-badge tbl-badge--success' };
    default:
      return { label: status, badgeClass: 'tbl-badge' };
  }
}

export function canEditCount(status: StockCountStatus): boolean {
  return status === 'DRAFT' || status === 'IN_PROGRESS';
}

export function canDeleteCount(status: StockCountStatus): boolean {
  return status === 'DRAFT';
}
