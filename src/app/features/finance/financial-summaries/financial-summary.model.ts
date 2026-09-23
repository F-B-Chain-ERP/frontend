export type FinancialSummaryStatus = 'DRAFT' | 'FINALIZED';

export type FinancialSummarySourceType = 'ORDERS' | 'REFUNDS' | 'EXPENSES';

export interface FinancialSummaryRecord {
  id: string;
  branchId: string;
  branchName?: string;
  businessDate: string;
  grossRevenue: number;
  discountAmount: number;
  netRevenue: number;
  totalCogs: number;
  grossProfit: number;
  totalExpense: number;
  netProfit: number;
  orderCount: number;
  status: FinancialSummaryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummaryOrderSource {
  orderId: string;
  orderCode: string;
  completedAt: string;
  subtotalAmount: number;
  discountAmount: number;
  totalCogsAmount: number;
}

export interface FinancialSummaryRefundSource {
  refundId: string;
  refundCode: string;
  orderId: string;
  processedAt: string;
  amount: number;
}

export interface FinancialSummaryExpenseSource {
  expenseId: string;
  expenseCategory: string;
  amount: number;
  expenseDate: string;
  description?: string;
}

export interface FinancialSummarySourcePage<T> {
  items: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export type FinancialSummaryStatusOption = {
  value: string | null;
  label: string;
  badgeClass: string;
};

export const FINANCIAL_SUMMARY_STATUS_OPTIONS: FinancialSummaryStatusOption[] = [
  { value: null, label: 'Tất cả trạng thái', badgeClass: '' },
  { value: 'DRAFT', label: 'Chưa chốt', badgeClass: 'tbl-badge--warning' },
  { value: 'FINALIZED', label: 'Đã chốt', badgeClass: 'tbl-badge--success' },
];

export function getFinancialSummaryStatusMeta(status: string): { label: string; badgeClass: string } {
  switch (status) {
    case 'DRAFT':
      return { label: 'Chưa chốt', badgeClass: 'tbl-badge tbl-badge--warning' };
    case 'FINALIZED':
      return { label: 'Đã chốt', badgeClass: 'tbl-badge tbl-badge--success' };
    default:
      return { label: status || '—', badgeClass: 'tbl-badge tbl-badge--neutral' };
  }
}
