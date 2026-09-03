/**
 * Stock Out Model & Constants
 * Quản lý Phiếu xuất kho (Kho & Lưu kho)
 */

export interface StockOutWarehouse {
  id: string;
  code: string;
  name: string;
}

export interface StockOutItem {
  id?: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  batchNo?: string | null;
}

export interface StockOut {
  id: string;
  code: string;
  warehouseId: string;
  warehouseName?: string;
  warehouse?: StockOutWarehouse;
  destinationType: 'BRANCH_ISSUE' | 'PRODUCTION_ISSUE' | 'TRANSFER_OUT' | 'WASTAGE' | 'ADJUSTMENT' | string;
  destinationReferenceId?: string | null;
  destinationReferenceCode?: string | null;
  outDate: string;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED' | string;
  note?: string;
  issuedBy?: { id: string; fullName: string } | string | null;
  issuedByName?: string | null;
  postedAt?: string | null;
  items?: StockOutItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StockOutFilter {
  query?: string;
  status?: string | null;
  warehouseId?: string | null;
  destinationType?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface StockOutListResponse {
  items: StockOut[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface StockOutOption {
  label: string;
  value: string;
}

/** Danh sách kho xuất */
export const STOCK_OUT_WAREHOUSE_OPTIONS: StockOutOption[] = [
  { value: 'wh-001', label: 'WH-HN - Kho tổng Hà Nội' },
  { value: 'wh-002', label: 'WH-DN - Kho nguyên liệu Đà Nẵng' },
  { value: 'wh-003', label: 'WH-HCM - Kho lạnh TP.HCM' },
  { value: 'wh-004', label: 'WH-MT - Kho trung chuyển Miền Tây' },
];

/** Mục đích / Phân loại xuất kho */
export const STOCK_OUT_DESTINATION_TYPE_OPTIONS = [
  { value: null, label: 'Tất cả mục đích xuất' },
  { value: 'BRANCH_ISSUE', label: 'Xuất cấp chi nhánh', badgeClass: 'tbl-badge--primary' },
  { value: 'PRODUCTION_ISSUE', label: 'Xuất pha chế / Sản xuất', badgeClass: 'tbl-badge--info' },
  { value: 'TRANSFER_OUT', label: 'Xuất điều chuyển kho', badgeClass: 'tbl-badge--warning' },
  { value: 'WASTAGE', label: 'Xuất hủy / Hao hụt', badgeClass: 'tbl-badge--danger' },
  { value: 'ADJUSTMENT', label: 'Xuất kiểm kê điều chỉnh', badgeClass: 'tbl-badge--neutral' },
];

/** Trạng thái phiếu xuất kho */
export const STOCK_OUT_STATUS_OPTIONS = [
  { value: null, label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp', badgeClass: 'tbl-badge--neutral' },
  { value: 'POSTED', label: 'Đã xuất kho', badgeClass: 'tbl-badge--success' },
  { value: 'CANCELLED', label: 'Đã hủy', badgeClass: 'tbl-badge--danger' },
];

export function getStockOutStatusMeta(status: string): { label: string; badgeClass: string } {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'POSTED':
    case 'COMPLETED':
    case 'APPROVED':
      return { label: 'Đã xuất kho', badgeClass: 'tbl-badge tbl-badge--success' };
    case 'CANCELLED':
    case 'REJECTED':
      return { label: 'Đã hủy', badgeClass: 'tbl-badge tbl-badge--danger' };
    case 'DRAFT':
    default:
      return { label: 'Nháp', badgeClass: 'tbl-badge tbl-badge--neutral' };
  }
}

export function getStockOutDestinationTypeMeta(destinationType: string): { label: string; badgeClass: string } {
  const s = String(destinationType || '').toUpperCase();
  switch (s) {
    case 'BRANCH_ISSUE':
      return { label: 'Xuất cấp chi nhánh', badgeClass: 'tbl-badge tbl-badge--primary' };
    case 'PRODUCTION_ISSUE':
      return { label: 'Xuất pha chế / SX', badgeClass: 'tbl-badge tbl-badge--info' };
    case 'TRANSFER_OUT':
      return { label: 'Xuất điều chuyển kho', badgeClass: 'tbl-badge tbl-badge--warning' };
    case 'WASTAGE':
      return { label: 'Xuất hủy / Hao hụt', badgeClass: 'tbl-badge tbl-badge--danger' };
    case 'ADJUSTMENT':
      return { label: 'Xuất điều chỉnh', badgeClass: 'tbl-badge tbl-badge--neutral' };
    default:
      return { label: destinationType || 'Khác', badgeClass: 'tbl-badge tbl-badge--neutral' };
  }
}
