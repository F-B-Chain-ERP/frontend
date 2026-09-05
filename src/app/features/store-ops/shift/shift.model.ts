export interface StoreShiftRecord {
  id: string;
  shiftCode: string;
  branchName: string;
  shiftName: string; // Ca sáng (06:30 - 14:30) / Ca tối (14:30 - 22:30)
  cashierName: string;
  managerName?: string;
  shiftDate: string;
  initialCash: number; // Tiền mặt đầu ca (tiền thối)
  cashSales: number;   // Doanh thu tiền mặt thu được
  bankTransferSales: number; // Doanh thu chuyển khoản VietQR/Thẻ
  totalSales: number;  // cashSales + bankTransferSales
  ordersCount: number; // Số đơn hoàn thành trong ca
  cashPayout: number;  // Chi quỹ tiền mặt (mua đá, phụ phí)
  expectedCash: number; // initialCash + cashSales - cashPayout
  actualCash: number;   // Tiền mặt thực tế đếm được trong két
  difference: number;   // actualCash - expectedCash (Lệch két)
  status: 'BALANCED' | 'SHORTAGE' | 'SURPLUS' | 'APPROVED';
  note?: string;
}
