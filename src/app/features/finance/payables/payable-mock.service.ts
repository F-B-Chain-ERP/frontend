import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { AccountsPayableRecord } from './payable.model';

@Injectable({
  providedIn: 'root',
})
export class PayableMockService {
  private payables: AccountsPayableRecord[] = [
    {
      id: 'ap-001',
      supplierId: 'sup-01',
      supplierCode: 'SUP-HT-01',
      supplierName: 'Công ty Cổ phần Hoàng Trà Quốc Tế',
      purchaseOrderId: 'po-01',
      poCode: 'PO-2026-0089',
      invoiceNo: 'HDA-2026-0038',
      invoiceAmount: 42500000,
      paidAmount: 20000000,
      remainingAmount: 22500000,
      dueDate: '15/09/2026',
      invoiceDate: '01/09/2026',
      paymentTermDays: 15,
      status: 'PARTIALLY_PAID',
      note: 'Tạm ứng đợt 1 nhận hàng kho tổng',
      createdAt: '01/09/2026',
    },
    {
      id: 'ap-002',
      supplierId: 'sup-02',
      supplierCode: 'SUP-DLM-02',
      supplierName: 'Công ty Sữa Đà Lạt Milk Chi nhánh Miền Bắc',
      purchaseOrderId: 'po-02',
      poCode: 'PO-2026-0085',
      invoiceNo: 'HDA-2026-0039',
      invoiceAmount: 38200000,
      paidAmount: 38200000,
      remainingAmount: 0,
      dueDate: '05/09/2026',
      invoiceDate: '25/08/2026',
      paymentTermDays: 10,
      status: 'PAID',
      note: 'Thanh toán trọn gói hóa đơn số 002914',
      createdAt: '25/08/2026',
    },
    {
      id: 'ap-003',
      supplierId: 'sup-03',
      supplierCode: 'SUP-ECO-03',
      supplierName: 'Nhà máy Bao bì & Ly giấy Thân Thiện ECO Green',
      purchaseOrderId: 'po-03',
      poCode: 'PO-2026-0090',
      invoiceNo: undefined,
      invoiceAmount: 18400000,
      paidAmount: 0,
      remainingAmount: 18400000,
      dueDate: '9999-12-31',
      paymentTermDays: 15,
      status: 'UNPAID',
      note: 'Tự động tạo từ đơn mua hàng PO-2026-0090',
      createdAt: '03/09/2026',
    },
    {
      id: 'ap-004',
      supplierId: 'sup-04',
      supplierCode: 'SUP-TNH-04',
      supplierName: 'Công ty TNHH Tân Nhất Hương (Topping & Bột béo)',
      purchaseOrderId: 'po-04',
      poCode: 'PO-2026-0078',
      invoiceNo: 'HDA-2026-0035',
      invoiceAmount: 26800000,
      paidAmount: 10000000,
      remainingAmount: 16800000,
      dueDate: '30/08/2026',
      invoiceDate: '15/08/2026',
      paymentTermDays: 15,
      status: 'OVERDUE',
      note: 'Thanh toán đợt 1',
      createdAt: '15/08/2026',
    },
  ];

  getPayables(query?: string): Observable<AccountsPayableRecord[]> {
    let list = [...this.payables];
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(p =>
        (p.invoiceNo || '').toLowerCase().includes(q) ||
        (p.poCode || '').toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q)
      );
    }
    return of(list).pipe(delay(200));
  }

  recordPayment(payableId: string, amount: number, note: string): Observable<AccountsPayableRecord> {
    const item = this.payables.find(p => p.id === payableId);
    if (item) {
      const newPaid = item.paidAmount + amount;
      const newRemaining = Math.max(0, item.invoiceAmount - newPaid);
      item.paidAmount = newPaid;
      item.remainingAmount = newRemaining;
      item.status = newRemaining === 0 ? 'PAID' : 'PARTIALLY_PAID';
      return of(item).pipe(delay(300));
    }
    throw new Error('Not found');
  }
}
