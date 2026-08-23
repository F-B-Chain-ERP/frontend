export enum PurchaseOrderStatus {
  DRAFT = 0,
  PENDING = 1,
  APPROVED = 2,
  CANCELLED = 3,
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
  orderDate: string;
  expectedDate?: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseOrderFilter {
  query?: string;
  status?: PurchaseOrderStatus | null;
  pageIndex: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend' | null;
}

export interface PurchaseOrderFormDTO {
  code: string;
  supplierId: string | number;
  supplierName: string;
  orderDate: string;
  expectedDate?: string;
  status: PurchaseOrderStatus;
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
  { value: PurchaseOrderStatus.PENDING, label: 'Chờ duyệt', badgeClass: 'tbl-badge--warning' },
  { value: PurchaseOrderStatus.APPROVED, label: 'Đã duyệt', badgeClass: 'tbl-badge--success' },
  { value: PurchaseOrderStatus.CANCELLED, label: 'Đã hủy', badgeClass: 'tbl-badge--danger' },
];

export function getPurchaseOrderStatusMeta(status: PurchaseOrderStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case PurchaseOrderStatus.APPROVED:
      return { label: 'Đã duyệt', badgeClass: 'tbl-badge tbl-badge--success' };
    case PurchaseOrderStatus.PENDING:
      return { label: 'Chờ duyệt', badgeClass: 'tbl-badge tbl-badge--warning' };
    case PurchaseOrderStatus.CANCELLED:
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
