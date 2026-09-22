export type KdsTicketStatus = 'QUEUED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export interface KdsTicketItem {
  id: string;
  kdsTicketId: string;
  orderItemId: string;
  productCode: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  sugarLevel: string | null;
  iceLevel: string | null;
  note: string | null;
  preparedQuantity: number;
  status: string;
  createdAt: string | null;
}

export interface KdsTicketSummary {
  id: string;
  orderId: string;
  orderCode: string | null;
  orderStatus: string | null;
  branchId: string;
  station: string;
  queueNo: number;
  ticketCode: string;
  status: string;
  customerName: string | null;
  orderType: string | null;
  totalItems: number;
  createdAt: string | null;
}

export interface KdsTicketDetail extends KdsTicketSummary {
  customerPhone: string | null;
  note: string | null;
  startedAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  items: KdsTicketItem[];
}

export interface KdsTicketFilter {
  branchId?: string | null;
  status?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  search?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface KdsTicketListResponse {
  items: KdsTicketSummary[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface StatusMeta {
  value: string;
  label: string;
  badgeClass: string;
}

export const KDS_TICKET_STATUS_OPTIONS: StatusMeta[] = [
  { value: 'QUEUED', label: 'Chờ làm', badgeClass: 'tbl-badge--warning' },
  { value: 'PREPARING', label: 'Đang pha chế', badgeClass: 'tbl-badge--info' },
  { value: 'READY', label: 'Sẵn sàng', badgeClass: 'tbl-badge--primary' },
  { value: 'SERVED', label: 'Đã phục vụ', badgeClass: 'tbl-badge--success' },
  { value: 'CANCELLED', label: 'Đã hủy', badgeClass: 'tbl-badge--danger' },
];

export function getKdsStatusMeta(status: string | null | undefined): StatusMeta {
  const s = (status ?? '').toUpperCase();
  return KDS_TICKET_STATUS_OPTIONS.find(o => o.value === s) ?? { value: s, label: s || '—', badgeClass: 'tbl-badge--neutral' };
}

/** Nút chuyển trạng thái bếp: KDS chỉ làm tới READY, còn lại để màn đơn bấm nốt (DELIVERING/COMPLETED auto SERVED ticket). */
export function nextKdsActions(status: string): string[] {
  const s = (status ?? '').toUpperCase();
  if (s === 'QUEUED') return ['PREPARING'];
  if (s === 'PREPARING') return ['READY'];
  return [];
}

export const KDS_STATUS_ACTION_LABELS: Record<string, string> = {
  PREPARING: 'Bắt đầu pha chế',
  READY: 'Báo sẵn sàng',
  SERVED: 'Đã phục vụ',
};

export const KDS_STATUS_ACTION_ICONS: Record<string, { icon: string; tooltip: string }> = {
  PREPARING: { icon: 'play-circle', tooltip: 'Bắt đầu pha chế' },
  READY: { icon: 'bell', tooltip: 'Báo món sẵn sàng' },
  SERVED: { icon: 'check-circle', tooltip: 'Đã phục vụ' },
};
