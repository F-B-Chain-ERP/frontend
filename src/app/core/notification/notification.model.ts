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
