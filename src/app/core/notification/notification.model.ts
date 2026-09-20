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
}

export interface SseTicketResponse {
  ticket: string;
  expiresInSeconds: number;
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
