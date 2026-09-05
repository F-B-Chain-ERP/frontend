export interface PaymentHistoryItem {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'BANK_TRANSFER' | 'CASH';
  bankReference?: string;
  note?: string;
}

export interface AccountsPayableRecord {
  id: string;
  payableCode: string;
  poCode: string;
  supplierCode: string;
  supplierName: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentTerms: string;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  payments: PaymentHistoryItem[];
}
