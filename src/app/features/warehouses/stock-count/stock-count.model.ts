export interface StockCountItem {
  id: string;
  materialCode: string;
  materialName: string;
  unit: string;
  systemStock: number; // Tồn lý thuyết trên hệ thống
  actualStock: number; // Tồn thực tế đếm được
  difference: number;  // actualStock - systemStock
  unitCost: number;
  discrepancyValue: number; // difference * unitCost
  reason?: string;
}

export interface StockCountTicket {
  id: string;
  code: string;
  branchName: string;
  shiftName: string; // Ca sáng / Ca chiều / Ca tối
  countedBy: string;
  countedDate: string;
  status: 'BALANCED' | 'DISCREPANCY' | 'APPROVED';
  totalItems: number;
  totalDiscrepancyValue: number;
  note?: string;
  items: StockCountItem[];
}
