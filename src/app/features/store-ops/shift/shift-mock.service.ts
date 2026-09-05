import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { StoreShiftRecord } from './shift.model';

@Injectable({
  providedIn: 'root',
})
export class ShiftMockService {
  private shifts: StoreShiftRecord[] = [
    {
      id: 'sft-001',
      shiftCode: 'SFT-HD-0409-S',
      branchName: 'Chi nhánh Hà Đông - 22 Trần Phú',
      shiftName: 'Ca sáng (06:30 - 14:30)',
      cashierName: 'Nguyễn Thúy Hằng',
      managerName: 'Trần Văn Mạnh (Cửa hàng trưởng)',
      shiftDate: '04/09/2026',
      initialCash: 1000000,
      cashSales: 5420000,
      bankTransferSales: 7380000,
      totalSales: 12800000,
      ordersCount: 224,
      cashPayout: 50000,
      expectedCash: 6370000,
      actualCash: 6370000,
      difference: 0,
      status: 'BALANCED',
      note: 'Chi 50.000đ mua thêm đá sạch khẩn cấp lúc 11h trưa',
    },
    {
      id: 'sft-002',
      shiftCode: 'SFT-CG-0409-S',
      branchName: 'Chi nhánh Cầu Giấy - 144 Xuân Thủy',
      shiftName: 'Ca sáng (06:30 - 14:30)',
      cashierName: 'Phạm Quỳnh Nga',
      managerName: 'Hoàng Minh Tuấn',
      shiftDate: '04/09/2026',
      initialCash: 1000000,
      cashSales: 6150000,
      bankTransferSales: 8350000,
      totalSales: 14500000,
      ordersCount: 256,
      cashPayout: 0,
      expectedCash: 7150000,
      actualCash: 7130000,
      difference: -20000,
      status: 'SHORTAGE',
      note: 'Lệch âm 20.000đ tiền thối nhầm đơn giờ cao điểm, thu ngân tự bù',
    },
    {
      id: 'sft-003',
      shiftCode: 'SFT-HK-0409-S',
      branchName: 'Chi nhánh Hoàn Kiếm - 12 Hàng Buồm',
      shiftName: 'Ca sáng (06:30 - 14:30)',
      cashierName: 'Trịnh Linh Chi',
      managerName: 'Đặng Mai Phương',
      shiftDate: '04/09/2026',
      initialCash: 1500000,
      cashSales: 7200000,
      bankTransferSales: 9000000,
      totalSales: 16200000,
      ordersCount: 288,
      cashPayout: 0,
      expectedCash: 8700000,
      actualCash: 8700000,
      difference: 0,
      status: 'BALANCED',
    },
    {
      id: 'sft-004',
      shiftCode: 'SFT-DD-0309-C',
      branchName: 'Chi nhánh Đống Đa - 54 Chùa Lộc',
      shiftName: 'Ca tối (14:30 - 22:30)',
      cashierName: 'Vũ Đức Thịnh',
      managerName: 'Đặng Quốc Bảo',
      shiftDate: '03/09/2026',
      initialCash: 1000000,
      cashSales: 4800000,
      bankTransferSales: 6400000,
      totalSales: 11200000,
      ordersCount: 195,
      cashPayout: 30000,
      expectedCash: 5770000,
      actualCash: 5770000,
      difference: 0,
      status: 'APPROVED',
      note: 'Đã nộp tiền két an toàn',
    },
  ];

  getShifts(query?: string): Observable<StoreShiftRecord[]> {
    let list = [...this.shifts];
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(s => s.shiftCode.toLowerCase().includes(q) || s.branchName.toLowerCase().includes(q) || s.cashierName.toLowerCase().includes(q));
    }
    return of(list).pipe(delay(200));
  }

  approveShift(shiftId: string): Observable<StoreShiftRecord> {
    const s = this.shifts.find(item => item.id === shiftId);
    if (s) {
      s.status = 'APPROVED';
      return of(s).pipe(delay(250));
    }
    throw new Error('Not found');
  }
}
