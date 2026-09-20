export interface PayablePayment {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  createdBy?: string;
  createdAt: string;
}

export interface AccountsPayableRecord {
  id: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  purchaseOrderId?: string;
  poCode?: string;
  invoiceNo?: string;
  invoiceAmount: number;
  paidAmount: number;
  remainingAmount: number;
  receivedDate?: string;
  dueDate?: string;
  paymentTermDays?: number;
  invoiceDate?: string;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  note?: string;
  createdAt: string;
  payments?: PayablePayment[];
}

export interface PayableSummary {
  totalRemaining: number;
  totalOverdue: number;
  overdueCount: number;
}

export type PayableStatusOption = {
  value: string | null;
  label: string;
  badgeClass: string;
};

export const PAYABLE_STATUS_OPTIONS: PayableStatusOption[] = [
  { value: null, label: 'Tất cả trạng thái', badgeClass: '' },
  { value: 'UNPAID', label: 'Chưa thanh toán', badgeClass: 'tbl-badge--neutral' },
  { value: 'PARTIALLY_PAID', label: 'Thanh toán một phần', badgeClass: 'tbl-badge--warning' },
  { value: 'PAID', label: 'Đã tất toán', badgeClass: 'tbl-badge--success' },
  { value: 'OVERDUE', label: 'Quá hạn nợ', badgeClass: 'tbl-badge--danger' },
];

export function getPayableStatusMeta(status: string): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'PAID':
      return { label: 'Đã tất toán', badgeClass: 'tbl-badge tbl-badge--success' };
    case 'PARTIALLY_PAID':
      return { label: 'Thanh toán 1 phần', badgeClass: 'tbl-badge tbl-badge--warning' };
    case 'OVERDUE':
      return { label: 'Quá hạn nợ', badgeClass: 'tbl-badge tbl-badge--danger' };
    case 'UNPAID':
    default:
      return { label: 'Chưa thanh toán', badgeClass: 'tbl-badge tbl-badge--neutral' };
  }
}
