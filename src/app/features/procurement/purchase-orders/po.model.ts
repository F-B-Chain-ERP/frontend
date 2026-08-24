/**
 * Model Đơn mua hàng (Purchase Order) — khớp 100% contract backend:
 * - Response: PurchaseOrderResponse (core-model)
 * - Request: CreatePurchaseOrderRequest / UpdatePurchaseOrderRequest
 * - Endpoint: /api/v1/proc/purchase-orders
 */

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED',
}

/** Dòng chi tiết đơn mua hàng — PurchaseOrderItemResponse của BE. */
export interface PurchaseOrderItem {
  id: string;
  status?: string | null;
  purchaseOrderId?: string | null;
  materialId: string;
  materialName: string | null;
  quantity: number;
  unitId: string;
  unitName: string | null;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number | null;
  createdBy?: string | null;
  createdAt?: string | null;
}

export interface PurchaseOrder {
  id: string;
  poCode: string;
  supplierId: string;
  supplierName: string | null;
  warehouseId: string;
  warehouseName: string | null;
  status: PurchaseOrderStatus;
  orderDate: string | null;
  expectedDate: string | null;
  subtotalAmount: number;
  totalAmount: number;
  note: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  items: PurchaseOrderItem[] | null;
  createdBy: string | null;
  createdAt: string | null;
}

/** Filter phía UI (pageIndex đếm từ 1, service tự convert sang page=0 của BE). */
export interface PurchaseOrderFilter {
  query?: string;
  status?: PurchaseOrderStatus | null;
  pageIndex: number;
  pageSize: number;
}

/** Wrapper phân trang chuẩn BE (PageResponse). */
export interface PageResponse<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

/** Một dòng hàng khi gửi lên BE (PurchaseOrderItemRequest). */
export interface PurchaseOrderItemPayload {
  materialId: string;
  unitId: string;
  quantity: number;
  unitPrice: number;
}

/** Body tạo mới — CreatePurchaseOrderRequest của BE. */
export interface CreatePurchaseOrderPayload {
  poCode?: string | null;
  supplierId: string;
  warehouseId: string;
  orderDate?: string | null;
  expectedDate?: string | null;
  note?: string | null;
  items: PurchaseOrderItemPayload[];
}

/** Body cập nhật — UpdatePurchaseOrderRequest của BE (chỉ áp dụng khi DRAFT). */
export interface UpdatePurchaseOrderPayload {
  supplierId?: string;
  warehouseId?: string;
  orderDate?: string | null;
  expectedDate?: string | null;
  note?: string | null;
  items?: PurchaseOrderItemPayload[];
}

export const PURCHASE_ORDER_STATUS_OPTIONS: { value: PurchaseOrderStatus | null; label: string; badgeClass: string }[] = [
  { value: null, label: 'Tất cả trạng thái', badgeClass: '' },
  { value: PurchaseOrderStatus.DRAFT, label: 'Nháp', badgeClass: 'tbl-badge--neutral' },
  { value: PurchaseOrderStatus.SUBMITTED, label: 'Chờ duyệt', badgeClass: 'tbl-badge--warning' },
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
    case PurchaseOrderStatus.SUBMITTED:
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
