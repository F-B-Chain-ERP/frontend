export type PosOrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

export type PosDeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERING' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

export type PosPaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export interface PosOrderSummary {
  id: string;
  orderCode: string;
  branchId: string;
  orderType: string;
  /** BE đặt tên receiverName (không phải customerName). */
  receiverName: string;
  totalAmount: number;
  status: string;
  createdAt: string | null;
}

export interface PosOrderItemTopping {
  toppingId: string | null;
  toppingName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PosOrderItem {
  id: string;
  productCode: string;
  productName: string;
  variantId: string | null;
  variantCode: string | null;
  variantName: string | null;
  quantity: number;
  iceLevel: string;
  sugarLevel: string;
  note: string | null;
  unitPrice: number;
  /** BE đặt tên amount (không phải totalPrice). */
  amount: number;
  unitCogsAmount: number;
  toppings: PosOrderItemTopping[];
}

export interface PosDeliveryInfo {
  id: string;
  orderId: string;
  shipperId: string | null;
  receiverName: string;
  receiverPhone: string;
  deliveryAddress: string;
  deliveryNote: string | null;
  deliveryFee: number;
  status: string;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  failReason: string | null;
}

export interface PosOrderDetail {
  id: string;
  orderCode: string;
  branchId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  orderType: string;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  totalAmount: number;
  totalCogs: number;
  /** BE map deliveryAddress entity vào key shippingAddress. */
  shippingAddress: string | null;
  note: string | null;
  createdAt: string | null;
  items: PosOrderItem[];
  delivery: PosDeliveryInfo | null;
}

export interface PosOrderHistory {
  id: string;
  orderId: string;
  oldStatus: string | null;
  newStatus: string;
  changedBy: string | null;
  changedAt: string;
  /** BE map reason entity vào key note. */
  note: string | null;
}

export interface PosOrderFilter {
  branchId?: string | null;
  orderType?: string | null;
  status?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface PosOrderListResponse {
  items: PosOrderSummary[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface StatusMeta {
  value: string;
  label: string;
  badgeClass: string;
}

export const POS_ORDER_STATUS_OPTIONS: StatusMeta[] = [
  { value: 'PENDING', label: 'Chờ xác nhận', badgeClass: 'tbl-badge--warning' },
  { value: 'CONFIRMED', label: 'Đã xác nhận', badgeClass: 'tbl-badge--primary' },
  { value: 'PREPARING', label: 'Đang pha chế', badgeClass: 'tbl-badge--info' },
  { value: 'READY', label: 'Sẵn sàng', badgeClass: 'tbl-badge--primary' },
  { value: 'DELIVERING', label: 'Đang giao', badgeClass: 'tbl-badge--info' },
  { value: 'COMPLETED', label: 'Hoàn tất', badgeClass: 'tbl-badge--success' },
  { value: 'CANCELLED', label: 'Đã hủy', badgeClass: 'tbl-badge--danger' },
  { value: 'REJECTED', label: 'Từ chối', badgeClass: 'tbl-badge--danger' },
];

export const POS_DELIVERY_STATUS_OPTIONS: StatusMeta[] = [
  { value: 'PENDING', label: 'Chờ gán', badgeClass: 'tbl-badge--warning' },
  { value: 'ASSIGNED', label: 'Đã gán', badgeClass: 'tbl-badge--primary' },
  { value: 'PICKED_UP', label: 'Đã lấy hàng', badgeClass: 'tbl-badge--info' },
  { value: 'DELIVERING', label: 'Đang giao', badgeClass: 'tbl-badge--info' },
  { value: 'DELIVERED', label: 'Đã giao', badgeClass: 'tbl-badge--success' },
  { value: 'FAILED', label: 'Thất bại', badgeClass: 'tbl-badge--danger' },
  { value: 'CANCELLED', label: 'Đã hủy', badgeClass: 'tbl-badge--danger' },
];

export function getOrderStatusMeta(status: string | null | undefined): StatusMeta {
  const s = (status ?? '').toUpperCase();
  return POS_ORDER_STATUS_OPTIONS.find(o => o.value === s) ?? { value: s, label: s || '—', badgeClass: 'tbl-badge--neutral' };
}

export function getDeliveryStatusMeta(status: string | null | undefined): StatusMeta {
  const s = (status ?? '').toUpperCase();
  return POS_DELIVERY_STATUS_OPTIONS.find(o => o.value === s) ?? { value: s, label: s || '—', badgeClass: 'tbl-badge--neutral' };
}

/** Nút chuyển trạng thái đơn được phép bấm theo machine BE (PosFlow). */
/**
 * Nút chuyển trạng thái được phép bấm theo machine BE (PosFlow).
 * strictPayment=true (mặc định): ẩn Hoàn tất khi chưa PAID (dùng khi đã có detail).
 * strictPayment=false: hiện Hoàn tất để staff bấm, BE từ chối nếu chưa trả (dùng ở
 * bảng list vì summary BE không có paymentStatus).
 */
export function nextOrderActions(orderType: string, status: string, paymentStatus: string, strictPayment = true): string[] {
  const s = (status ?? '').toUpperCase();
  const type = (orderType ?? '').toUpperCase();
  const paid = (paymentStatus ?? '').toUpperCase() === 'PAID';
  const actions: string[] = [];
  if (s === 'PENDING') actions.push('CONFIRMED');
  if (s === 'CONFIRMED') actions.push('PREPARING');
  if (s === 'PREPARING') actions.push('READY');
  if (s === 'READY') {
    if (type === 'DELIVERY') actions.push('DELIVERING');
    else if (paid || !strictPayment) actions.push('COMPLETED');
  }
  if (s === 'DELIVERING' && (paid || !strictPayment)) actions.push('COMPLETED');
  if (['PENDING', 'CONFIRMED', 'PREPARING'].includes(s)) actions.push('CANCELLED', 'REJECTED');
  return actions;
}

export const ORDER_STATUS_ACTION_LABELS: Record<string, string> = {
  CONFIRMED: 'Xác nhận',
  PREPARING: 'Pha chế',
  READY: 'Sẵn sàng',
  DELIVERING: 'Đi giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Hủy đơn',
  REJECTED: 'Từ chối',
};

/** Icon + tooltip nút thao tác (hiển thị icon như màn kiểm kê, không nút chữ). */
export const ORDER_STATUS_ACTION_ICONS: Record<string, { icon: string; tooltip: string }> = {
  CONFIRMED: { icon: 'check', tooltip: 'Xác nhận đơn' },
  PREPARING: { icon: 'play-circle', tooltip: 'Bắt đầu pha chế' },
  READY: { icon: 'bell', tooltip: 'Sẵn sàng phục vụ' },
  DELIVERING: { icon: 'car', tooltip: 'Bắt đầu đi giao' },
  COMPLETED: { icon: 'check-circle', tooltip: 'Hoàn tất đơn' },
  CANCELLED: { icon: 'close-circle', tooltip: 'Hủy đơn' },
  REJECTED: { icon: 'stop', tooltip: 'Từ chối đơn' },
};

/** Các chặng hiển thị nz-steps trong modal chi tiết (như kiểm kê). */
export function orderStepTitles(orderType: string): string[] {
  const base = ['Chờ xác nhận', 'Đã xác nhận', 'Pha chế', 'Sẵn sàng'];
  if ((orderType ?? '').toUpperCase() === 'DELIVERY') base.push('Đi giao');
  base.push('Hoàn tất');
  return base;
}

/** Vị trí hiện tại trên steps, -1 khi đơn kết thúc bất thường (hủy/từ chối: ẩn steps). */
export function orderStepIndex(orderType: string, status: string): number {
  const s = (status ?? '').toUpperCase();
  const base: Record<string, number> = { PENDING: 0, CONFIRMED: 1, PREPARING: 2, READY: 3 };
  if (s in base) return base[s];
  if (s === 'DELIVERING') return 4;
  if (s === 'COMPLETED') return (orderType ?? '').toUpperCase() === 'DELIVERY' ? 5 : 4;
  return -1;
}

/** Các chặng giao hàng cho board điều phối. */
export function deliveryStepTitles(): string[] {
  return ['Chờ gán', 'Đã gán', 'Lấy hàng', 'Đang giao', 'Đã giao'];
}

export function deliveryStepIndex(status: string): number {
  const map: Record<string, number> = { PENDING: 0, ASSIGNED: 1, PICKED_UP: 2, DELIVERING: 3, DELIVERED: 4 };
  return map[(status ?? '').toUpperCase()] ?? -1;
}
