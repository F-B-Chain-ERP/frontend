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
  type?: 'PO_SUBMITTED' | 'PO_APPROVED' | 'PO_REJECTED' | 'PO_CANCELLED' | 'PO_RECEIVED' | 'PAYABLE_OVERDUE' | 'GENERAL' | string;
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

/**
 * Sự kiện SSE báo cáo hoàn tất/thất bại do queue-service publish.
 * @see {@type REPORT_DONE} / {@type REPORT_FAILED}
 */
export interface ReportSseEvent {
  jobId: string;
  module?: string;
  reportType?: string;
  format?: string;
  status: 'DONE' | 'FAILED';
  fileName?: string;
  fileUrl?: string;
  errorMessage?: string;
  requestedBy?: string;
  completedAt?: string;
  message?: string;
}

/** Kiểm tra payload SSE có phải sự kiện báo cáo (REPORT_DONE/REPORT_FAILED) hay không. */
export function isReportSseEvent(payload: unknown): payload is ReportSseEvent {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p['jobId'] === 'string' && (p['type'] === 'REPORT_DONE' || p['type'] === 'REPORT_FAILED');
}
