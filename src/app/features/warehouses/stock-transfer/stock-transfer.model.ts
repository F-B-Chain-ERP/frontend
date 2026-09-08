/** Phiếu chuyển kho (map từ StockTransferResponse của BE). */
export type StockTransferStatus = 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface StockTransferItem {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  quantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  unitPrice: number | null;
}

export interface StockTransfer {
  id: string;
  code: string;
  fromWarehouseId: string;
  fromWarehouseCode: string | null;
  fromWarehouseName: string | null;
  toWarehouseId: string;
  toWarehouseCode: string | null;
  toWarehouseName: string | null;
  transferDate: string;
  status: StockTransferStatus;
  note: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  items: StockTransferItem[];
}

export interface StockTransferFilter {
  query?: string;
  status?: string | null;
  warehouseId?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface StockTransferListResponse {
  items: StockTransfer[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface CreateTransferItemPayload {
  materialId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateTransferPayload {
  code?: string | null;
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate: string;
  note?: string | null;
  items: CreateTransferItemPayload[];
}

export interface ReceiveTransferItemPayload {
  itemId: string;
  receivedQuantity: number;
}

export const TRANSFER_STATUS_OPTIONS = [
  { value: null, label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ xuất hàng' },
  { value: 'IN_TRANSIT', label: 'Đang chuyển' },
  { value: 'RECEIVED', label: 'Đã nhận đủ' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

export function getTransferStatusMeta(status: StockTransferStatus): { label: string; badgeClass: string } {
  switch (status) {
    case 'PENDING':
      return { label: 'Chờ xuất hàng', badgeClass: 'tbl-badge tbl-badge--warning' };
    case 'IN_TRANSIT':
      return { label: 'Đang chuyển', badgeClass: 'tbl-badge tbl-badge--info' };
    case 'RECEIVED':
      return { label: 'Đã nhận đủ', badgeClass: 'tbl-badge tbl-badge--success' };
    case 'CANCELLED':
      return { label: 'Đã hủy', badgeClass: 'tbl-badge tbl-badge--danger' };
    default:
      return { label: status, badgeClass: 'tbl-badge' };
  }
}

export function canEditTransfer(status: StockTransferStatus): boolean {
  return status === 'PENDING';
}

export function canDispatchTransfer(status: StockTransferStatus): boolean {
  return status === 'PENDING';
}

export function canReceiveTransfer(status: StockTransferStatus): boolean {
  return status === 'IN_TRANSIT';
}

export function canCancelTransfer(status: StockTransferStatus): boolean {
  return status === 'PENDING' || status === 'IN_TRANSIT';
}
