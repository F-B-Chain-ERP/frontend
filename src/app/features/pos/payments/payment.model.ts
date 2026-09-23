export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export interface PaymentItem {
  id: string;
  orderCode: string;
  branchId: string;
  orderType: string;
  receiverName: string;
  totalAmount: number;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
  createdAt: string | null;
}

export interface PaymentFilter {
  branchId?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  search?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface PaymentListResponse {
  items: PaymentItem[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface StatusMeta {
  value: string;
  label: string;
  badgeClass: string;
}

export const PAYMENT_STATUS_OPTIONS: StatusMeta[] = [
  { value: 'UNPAID', label: 'Chưa thanh toán', badgeClass: 'tbl-badge--warning' },
  { value: 'PAID', label: 'Đã thanh toán', badgeClass: 'tbl-badge--success' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền', badgeClass: 'tbl-badge--neutral' },
];

export const PAYMENT_METHOD_OPTIONS: StatusMeta[] = [
  { value: 'CASH', label: 'Tiền mặt', badgeClass: 'tbl-badge--neutral' },
  { value: 'COD', label: 'Thu hộ (COD)', badgeClass: 'tbl-badge--neutral' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản', badgeClass: 'tbl-badge--info' },
  { value: 'VNPAY', label: 'VNPay (sắp tới)', badgeClass: 'tbl-badge--neutral' },
  { value: 'MOMO', label: 'MoMo (sắp tới)', badgeClass: 'tbl-badge--neutral' },
];

export function getPaymentStatusMeta(status: string | null | undefined): StatusMeta {
  const s = (status ?? '').toUpperCase();
  return (
    PAYMENT_STATUS_OPTIONS.find(o => o.value === s) ?? {
      value: s,
      label: s || '—',
      badgeClass: 'tbl-badge--neutral',
    }
  );
}

export function getPaymentMethodLabel(method: string | null | undefined): string {
  const s = (method ?? '').toUpperCase();
  return PAYMENT_METHOD_OPTIONS.find(o => o.value === s)?.label ?? method ?? '—';
}

export const ORDER_STATUS_OPTIONS: StatusMeta[] = [
  { value: 'PENDING', label: 'Chờ xác nhận', badgeClass: 'tbl-badge--warning' },
  { value: 'CONFIRMED', label: 'Đã xác nhận', badgeClass: 'tbl-badge--primary' },
  { value: 'PREPARING', label: 'Đang pha chế', badgeClass: 'tbl-badge--info' },
  { value: 'READY', label: 'Sẵn sàng', badgeClass: 'tbl-badge--primary' },
  { value: 'DELIVERING', label: 'Đang giao', badgeClass: 'tbl-badge--info' },
  { value: 'COMPLETED', label: 'Hoàn tất', badgeClass: 'tbl-badge--success' },
  { value: 'CANCELLED', label: 'Đã hủy', badgeClass: 'tbl-badge--danger' },
  { value: 'REJECTED', label: 'Từ chối', badgeClass: 'tbl-badge--danger' },
];

export function getOrderStatusMeta(status: string | null | undefined): StatusMeta {
  const s = (status ?? '').toUpperCase();
  return (
    ORDER_STATUS_OPTIONS.find(o => o.value === s) ?? {
      value: s,
      label: s || '—',
      badgeClass: 'tbl-badge--neutral',
    }
  );
}

/** Đơn đã kết thúc thì BE cấm đổi thanh toán (COMPLETED/CANCELLED/REJECTED). */
export function isTerminalOrderStatus(status: string | null | undefined): boolean {
  const s = (status ?? '').toUpperCase();
  return s === 'COMPLETED' || s === 'CANCELLED' || s === 'REJECTED';
}

/** Chỉ cho thu khi chưa trả và đơn chưa kết thúc (đúng luật BE updatePaymentStatus). */
export function canCollectPayment(item: PaymentItem): boolean {
  return (item.paymentStatus ?? '').toUpperCase() === 'UNPAID' && !isTerminalOrderStatus(item.status);
}

/** Đơn online (VNPAY/MOMO) chưa có webhook — thu tay chỉ là tạm, chưa đối soát cổng. */
export function isOnlineManualMethod(method: string | null | undefined): boolean {
  const s = (method ?? '').toUpperCase();
  return s === 'VNPAY' || s === 'MOMO';
}
