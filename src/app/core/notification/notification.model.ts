export interface AppNotification {
  id: string;
  accountId: string;
  title: string;
  body: string;
  status: 'PENDING' | 'READ' | string;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
  actionUrl?: string;
  type?: 'PO_SUBMITTED' | 'PO_APPROVED' | 'PO_REJECTED' | 'PO_CANCELLED' | 'PO_RECEIVED' | 'GENERAL' | string;
  /** Item chỉ tồn tại trong phiên hiện tại khi backend broadcast theo chi nhánh. */
  transient?: boolean;
}

export interface SseTicketResponse {
  ticket: string;
  expiresInSeconds: number;
}

export interface OrderRealtimePayload {
  eventType: 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED' | 'DELIVERY_ASSIGNED' | 'DELIVERY_STATUS_CHANGED' | string;
  orderId: string;
  orderCode: string;
  branchId?: string;
  customerId?: string;
  shipperId?: string;
  orderStatus: string;
  deliveryStatus?: string;
  paymentStatus?: string;
  title: string;
  message: string;
  timestamp: string;
}
