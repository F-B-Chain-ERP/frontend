export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export interface PurchaseOrderItem {
  id: string | number;
  materialName: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string | number;
  code: string;
  supplierId: string | number;
  supplierName: string;
  warehouseId?: string | number;
  warehouseName?: string;
  branchId?: string | number;
  branchName?: string;
  orderDate: string;
  expectedDate?: string;
  status: PurchaseOrderStatus | string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseOrderFilter {
  query?: string;
  status?: PurchaseOrderStatus | string | null;
  warehouseId?: string | number | null;
  branchId?: string | number | null;
  pageIndex: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend' | null;
}

export interface PurchaseOrderFormDTO {
  code: string;
  supplierId: string | number;
  supplierName: string;
  warehouseId: string | number;
  warehouseName?: string;
  branchId?: string | number;
  branchName?: string;
  orderDate: string;
  expectedDate?: string;
  status: PurchaseOrderStatus | string;
  items: PurchaseOrderItem[];
  note?: string;
}

export interface PurchaseOrderListResponse {
  items: PurchaseOrder[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const PURCHASE_ORDER_STATUS_OPTIONS = [
  { value: null, label: 'Tất cả trạng thái' },
  { value: PurchaseOrderStatus.DRAFT, label: 'Nháp', badgeClass: 'tbl-badge--neutral' },
  { value: PurchaseOrderStatus.SUBMITTED, label: 'Chờ duyệt', badgeClass: 'tbl-badge--warning' },
  { value: PurchaseOrderStatus.APPROVED, label: 'Đã duyệt', badgeClass: 'tbl-badge--primary' },
  { value: PurchaseOrderStatus.PARTIALLY_RECEIVED, label: 'Đang nhận', badgeClass: 'tbl-badge--info' },
  { value: PurchaseOrderStatus.RECEIVED, label: 'Đã nhận hàng', badgeClass: 'tbl-badge--success' },
  { value: PurchaseOrderStatus.CANCELLED, label: 'Đã hủy', badgeClass: 'tbl-badge--danger' },
];

export function getPurchaseOrderStatusMeta(status: PurchaseOrderStatus | string | number): {
  label: string;
  badgeClass: string;
} {
  const str = String(status).toUpperCase();
  switch (str) {
    case 'APPROVED':
    case '2':
      return { label: 'Đã duyệt', badgeClass: 'tbl-badge tbl-badge--primary' };
    case 'SUBMITTED':
    case 'PENDING':
    case '1':
      return { label: 'Chờ duyệt', badgeClass: 'tbl-badge tbl-badge--warning' };
    case 'PARTIALLY_RECEIVED':
      return { label: 'Đang nhận hàng', badgeClass: 'tbl-badge tbl-badge--info' };
    case 'RECEIVED':
      return { label: 'Đã nhận đủ', badgeClass: 'tbl-badge tbl-badge--success' };
    case 'CANCELLED':
    case '3':
      return { label: 'Đã hủy', badgeClass: 'tbl-badge tbl-badge--danger' };
    default:
      return { label: 'Nháp', badgeClass: 'tbl-badge tbl-badge--neutral' };
  }
}

export function calcLineTotal(item: Pick<PurchaseOrderItem, 'quantity' | 'unitPrice'>): number {
  return (item.quantity || 0) * (item.unitPrice || 0);
}

export function calcGrandTotal(items: Pick<PurchaseOrderItem, 'quantity' | 'unitPrice'>[]): number {
  return items.reduce((sum, item) => sum + calcLineTotal(item), 0);
}
