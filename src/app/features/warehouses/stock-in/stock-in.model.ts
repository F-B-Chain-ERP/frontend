/**
 * Stock In Model & Constants
 * Quản lý Phiếu nhập kho (Kho & Lưu kho)
 */

export interface StockInWarehouse {
  id: string;
  code: string;
  name: string;
}

export interface StockInItem {
  id?: string;
  purchaseOrderItemId?: string | null;
  materialId: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  batchNo?: string | null;
  expiryDate?: string | null;
}

export interface StockIn {
  id: string;
  code: string;
  warehouseId: string;
  warehouseName?: string;
  warehouse?: StockInWarehouse;
  sourceType: 'PURCHASE' | 'TRANSFER_IN' | 'ADJUSTMENT' | 'RETURN' | string;
  sourceReferenceId?: string | null;
  sourceReferenceCode?: string | null;
  inDate: string;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED' | string;
  note?: string;
  receivedBy?: { id: string; fullName: string } | string | null;
  receivedByName?: string | null;
  postedAt?: string | null;
  items?: StockInItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StockInFilter {
  query?: string;
  status?: string | null;
  warehouseId?: string | null;
  sourceType?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface StockInListResponse {
  items: StockIn[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface StockInOption {
  label: string;
  value: string;
}

/** Danh sách kho nhập */
export const STOCK_IN_WAREHOUSE_OPTIONS: StockInOption[] = [
  { value: 'wh-001', label: 'WH-HN - Kho tổng Hà Nội' },
  { value: 'wh-002', label: 'WH-DN - Kho nguyên liệu Đà Nẵng' },
  { value: 'wh-003', label: 'WH-HCM - Kho lạnh TP.HCM' },
  { value: 'wh-004', label: 'WH-MT - Kho trung chuyển Miền Tây' },
];

/** Nguồn chứng từ nhập kho */
export const STOCK_IN_SOURCE_TYPE_OPTIONS = [
  { value: null, label: 'Tất cả nguồn nhập' },
  { value: 'PURCHASE', label: 'Mua hàng từ NCC', badgeClass: 'tbl-badge--primary' },
  { value: 'TRANSFER_IN', label: 'Chuyển kho đến', badgeClass: 'tbl-badge--info' },
  { value: 'RETURN', label: 'Nhập trả hàng', badgeClass: 'tbl-badge--warning' },
  { value: 'ADJUSTMENT', label: 'Kiểm kê điều chỉnh', badgeClass: 'tbl-badge--neutral' },
];

/** Trạng thái phiếu nhập kho */
export const STOCK_IN_STATUS_OPTIONS = [
  { value: null, label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp', badgeClass: 'tbl-badge--neutral' },
  { value: 'POSTED', label: 'Đã nhập kho', badgeClass: 'tbl-badge--success' },
  { value: 'CANCELLED', label: 'Đã hủy', badgeClass: 'tbl-badge--danger' },
];

export function getStockInStatusMeta(status: string): { label: string; badgeClass: string } {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'POSTED':
    case 'COMPLETED':
    case 'APPROVED':
      return { label: 'Đã nhập kho', badgeClass: 'tbl-badge tbl-badge--success' };
    case 'CANCELLED':
    case 'REJECTED':
      return { label: 'Đã hủy', badgeClass: 'tbl-badge tbl-badge--danger' };
    case 'DRAFT':
    default:
      return { label: 'Nháp', badgeClass: 'tbl-badge tbl-badge--neutral' };
  }
}

export function getStockInSourceTypeMeta(sourceType: string): { label: string; badgeClass: string } {
  const s = String(sourceType || '').toUpperCase();
  switch (s) {
    case 'PURCHASE':
      return { label: 'Mua hàng từ NCC', badgeClass: 'tbl-badge tbl-badge--primary' };
    case 'TRANSFER_IN':
      return { label: 'Chuyển kho đến', badgeClass: 'tbl-badge tbl-badge--info' };
    case 'RETURN':
      return { label: 'Nhập trả hàng', badgeClass: 'tbl-badge tbl-badge--warning' };
    case 'ADJUSTMENT':
      return { label: 'Kiểm kê điều chỉnh', badgeClass: 'tbl-badge tbl-badge--neutral' };
    default:
      return { label: sourceType || 'Khác', badgeClass: 'tbl-badge tbl-badge--neutral' };
  }
}
