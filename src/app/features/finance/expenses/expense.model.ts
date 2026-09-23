export interface ExpenseRecord {
  id: string;
  branchId?: string;
  branchName?: string;
  expenseDate: string;
  expenseCategory: string;
  amount: number;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCreatePayload {
  branchId?: string;
  expenseDate: string;
  expenseCategory: string;
  amount: number;
  description?: string;
}

export interface ExpenseUpdatePayload {
  branchId?: string;
  expenseDate: string;
  expenseCategory: string;
  amount: number;
  description?: string;
}

export type ExpenseStatusOption = {
  value: string | null;
  label: string;
  badgeClass: string;
};

export const EXPENSE_STATUS_OPTIONS: ExpenseStatusOption[] = [
  { value: null, label: 'Tất cả trạng thái', badgeClass: '' },
  { value: 'ACTIVE', label: 'Hiệu lực', badgeClass: 'tbl-badge--success' },
  { value: 'INACTIVE', label: 'Đã xóa (vô hiệu)', badgeClass: 'tbl-badge--neutral' },
];

export function getExpenseStatusMeta(status: string): { label: string; badgeClass: string } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Hiệu lực', badgeClass: 'tbl-badge tbl-badge--success' };
    case 'INACTIVE':
      return { label: 'Đã xóa (vô hiệu)', badgeClass: 'tbl-badge tbl-badge--neutral' };
    default:
      return { label: status || '—', badgeClass: 'tbl-badge tbl-badge--neutral' };
  }
}

export const CENTRAL_BRANCH_VALUE = '__CENTRAL__';