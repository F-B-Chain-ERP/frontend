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
      payableCode: 'AP-2026-0038',
      poCode: 'PO-2026-0089',
      supplierCode: 'SUP-HT-01',
      supplierName: 'Công ty Cổ phần Hoàng Trà Quốc Tế',
      issueDate: '01/09/2026',
      dueDate: '15/09/2026',
      totalAmount: 42500000,
      paidAmount: 20000000,
      remainingAmount: 22500000,
      paymentTerms: 'Gối đầu 15 ngày kể từ ngày nhận đủ hàng',
      status: 'PARTIAL',
      payments: [
        { id: 'p-1', paymentDate: '02/09/2026', amount: 20000000, paymentMethod: 'BANK_TRANSFER', bankReference: 'MB-TX-88912', note: 'Tạm ứng đợt 1 nhận hàng kho tổng' },
      ],
    },
    {
      id: 'ap-002',
      payableCode: 'AP-2026-0039',
      poCode: 'PO-2026-0085',
      supplierCode: 'SUP-DLM-02',
      supplierName: 'Công ty Sữa Đà Lạt Milk Chi nhánh Miền Bắc',
      issueDate: '25/08/2026',
      dueDate: '05/09/2026',
      totalAmount: 38200000,
      paidAmount: 38200000,
      remainingAmount: 0,
      paymentTerms: 'Thanh toán 10 ngày sau xuất hóa đơn GTGT',
      status: 'PAID',
      payments: [
        { id: 'p-2', paymentDate: '03/09/2026', amount: 38200000, paymentMethod: 'BANK_TRANSFER', bankReference: 'VCB-FT-44129', note: 'Thanh toán trọn gói hóa đơn số 002914' },
      ],
    },
    {
      id: 'ap-003',
      payableCode: 'AP-2026-0040',
      poCode: 'PO-2026-0090',
      supplierCode: 'SUP-ECO-03',
      supplierName: 'Nhà máy Bao bì & Ly giấy Thân Thiện ECO Green',
      issueDate: '03/09/2026',
      dueDate: '18/09/2026',
      totalAmount: 18400000,
      paidAmount: 0,
      remainingAmount: 18400000,
      paymentTerms: 'Gối đầu 15 ngày',
      status: 'UNPAID',
      payments: [],
    },
    {
      id: 'ap-004',
      payableCode: 'AP-2026-0035',
      poCode: 'PO-2026-0078',
      supplierCode: 'SUP-TNH-04',
      supplierName: 'Công ty TNHH Tân Nhất Hương (Topping & Bột béo)',
      issueDate: '15/08/2026',
      dueDate: '30/08/2026',
      totalAmount: 26800000,
      paidAmount: 10000000,
      remainingAmount: 16800000,
      paymentTerms: 'Thanh toán sau 15 ngày nhận hàng',
      status: 'OVERDUE',
      payments: [
        { id: 'p-3', paymentDate: '20/08/2026', amount: 10000000, paymentMethod: 'BANK_TRANSFER', bankReference: 'TCB-TX-10928', note: 'Thanh toán đợt 1' },
      ],
    },
  ];

  getPayables(query?: string): Observable<AccountsPayableRecord[]> {
    let list = [...this.payables];
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(p => p.payableCode.toLowerCase().includes(q) || p.poCode.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q));
    }
    return of(list).pipe(delay(200));
  }

  recordPayment(payableId: string, amount: number, note: string): Observable<AccountsPayableRecord> {
    const item = this.payables.find(p => p.id === payableId);
    if (item) {
      const newPaid = item.paidAmount + amount;
      const newRemaining = Math.max(0, item.totalAmount - newPaid);
      item.paidAmount = newPaid;
      item.remainingAmount = newRemaining;
      item.status = newRemaining === 0 ? 'PAID' : 'PARTIAL';
      item.payments.push({
        id: 'p-' + Date.now(),
        paymentDate: 'Hôm nay (Vừa ghi nhận)',
        amount,
        paymentMethod: 'BANK_TRANSFER',
        bankReference: 'UNC-ERP-' + Math.floor(100000 + Math.random() * 900000),
        note,
      });
      return of(item).pipe(delay(300));
    }
    throw new Error('Not found');
  }
}
