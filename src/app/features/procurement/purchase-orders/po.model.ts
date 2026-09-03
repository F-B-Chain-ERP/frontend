export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
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
  rejectedAt?: string | null;
  rejectedBy?: { id: string; fullName: string } | null;
  rejectReason?: string | null;
}

export interface PurchaseOrderFilter {
  query?: string;
  status?: PurchaseOrderStatus | string | null;
  warehouseId?: string | number | null;
  branchId?: string | number | null;
  fromDate?: string | null;
  toDate?: string | null;
  pageIndex: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend' | null;
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
  { value: PurchaseOrderStatus.REJECTED, label: 'Đã từ chối', badgeClass: 'tbl-badge--danger' },
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
    case 'REJECTED':
      return { label: 'Đã từ chối', badgeClass: 'tbl-badge tbl-badge--danger' };
    default:
      return { label: 'Nháp', badgeClass: 'tbl-badge tbl-badge--neutral' };
  }
}

/** Tuỳ chọn hiển thị trong các dropdown (NCC, NVL, kho, đơn vị). */
export interface PoOption {
  label: string;
  value: string;
}

/** Dòng chi tiết trong biểu mẫu tạo/cập nhật. */
export interface PurchaseOrderItemForm {
  materialId: string | null;
  unitId: string | null;
  quantity: number | null;
  unitPrice: number | null;
}

/** Chi tiết đơn mua hàng (khớp response BE, chứa id của NVL/đơn vị). */
export interface PurchaseOrderItemDetail {
  id?: string;
  materialId: string;
  materialName?: string;
  unitId: string;
  unitName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  receivedQuantity?: number;
}

export interface PurchaseOrderDetail {
  id: string;
  poCode: string;
  status: string;
  orderDate: string;
  expectedDate?: string | null;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  subtotalAmount?: number;
  totalAmount: number;
  note?: string;
  submittedAt?: string | null;
  approvedBy?: { id: string; fullName: string } | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: { id: string; fullName: string } | null;
  rejectReason?: string | null;
  createdAt?: string | null;
  items: PurchaseOrderItemDetail[];
}

/** Payload gửi BE khi tạo/cập nhật (khớp Create/UpdatePurchaseOrderRequest). */
export interface PurchaseOrderPayload {
  poCode?: string;
  supplierId: string;
  warehouseId: string;
  orderDate: string;
  expectedDate?: string;
  note?: string;
  items: {
    materialId: string;
    unitId: string;
    quantity: number;
    unitPrice: number;
  }[];
}
