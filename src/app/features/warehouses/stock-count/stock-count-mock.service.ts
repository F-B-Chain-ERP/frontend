import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { StockCountTicket } from './stock-count.model';

@Injectable({
  providedIn: 'root',
})
export class StockCountMockService {
  private tickets: StockCountTicket[] = [
    {
      id: 'sc-001',
      code: 'SC-CG-0409-S',
      branchName: 'Chi nhánh Cầu Giấy - 144 Xuân Thủy',
      shiftName: 'Ca sáng (06:30 - 14:30)',
      countedBy: 'Hoàng Minh Tuấn (Trưởng ca)',
      countedDate: '04/09/2026 14:35',
      status: 'DISCREPANCY',
      totalItems: 8,
      totalDiscrepancyValue: -215000,
      note: 'Phát hiện hao hụt trân châu do nấu quá lửa phải đổ bỏ 1 mẻ 2kg',
      items: [
        { id: 'sci-1', materialCode: 'MAT-TEA-01', materialName: 'Nước cốt Trà Oolong', unit: 'ml', systemStock: 4500, actualStock: 4500, difference: 0, unitCost: 35, discrepancyValue: 0 },
        { id: 'sci-2', materialCode: 'MAT-TOP-02', materialName: 'Trân châu đen Đài Loan', unit: 'g', systemStock: 5200, actualStock: 3200, difference: -2000, unitCost: 65, discrepancyValue: -130000, reason: 'Nấu cháy đáy nồi 1 mẻ' },
        { id: 'sci-3', materialCode: 'MAT-MILK-01', materialName: 'Sữa tươi Đà Lạt Milk', unit: 'ml', systemStock: 8000, actualStock: 6500, difference: -1500, unitCost: 30, discrepancyValue: -45000, reason: 'Đổ bình tràn lúc đánh bọt' },
        { id: 'sci-4', materialCode: 'MAT-PKG-01', materialName: 'Vỏ ly nhựa PP 500ml', unit: 'cái', systemStock: 420, actualStock: 380, difference: -40, unitCost: 850, discrepancyValue: -34000, reason: 'Lỗi dập nhiệt rách miệng ly' },
        { id: 'sci-5', materialCode: 'MAT-SUG-01', materialName: 'Nước đường mía', unit: 'ml', systemStock: 6000, actualStock: 6000, difference: 0, unitCost: 25, discrepancyValue: 0 },
        { id: 'sci-6', materialCode: 'MAT-PKG-03', materialName: 'Ống hút giấy', unit: 'cái', systemStock: 650, actualStock: 645, difference: -5, unitCost: 700, discrepancyValue: -3500, reason: 'Rơi sàn' },
        { id: 'sci-7', materialCode: 'MAT-ICE-01', materialName: 'Đá viên tinh khiết', unit: 'g', systemStock: 15000, actualStock: 14000, difference: -1000, unitCost: 2, discrepancyValue: -2500, reason: 'Tan chảy tự nhiên' },
        { id: 'sci-8', materialCode: 'MAT-CF-01', materialName: 'Hạt cà phê Arabica', unit: 'g', systemStock: 2500, actualStock: 2500, difference: 0, unitCost: 210, discrepancyValue: 0 },
      ],
    },
    {
      id: 'sc-002',
      code: 'SC-HD-0409-S',
      branchName: 'Chi nhánh Hà Đông - 22 Trần Phú',
      shiftName: 'Ca sáng (06:30 - 14:30)',
      countedBy: 'Lê Thị Thu Thảo (Cửa hàng phó)',
      countedDate: '04/09/2026 14:40',
      status: 'BALANCED',
      totalItems: 6,
      totalDiscrepancyValue: -8000,
      note: 'Số liệu khớp 99.8%, hao hụt rơi vãi trong ngưỡng cho phép',
      items: [
        { id: 'sci-9', materialCode: 'MAT-TEA-01', materialName: 'Nước cốt Trà Oolong', unit: 'ml', systemStock: 6200, actualStock: 6200, difference: 0, unitCost: 35, discrepancyValue: 0 },
        { id: 'sci-10', materialCode: 'MAT-TOP-02', materialName: 'Trân châu đen Đài Loan', unit: 'g', systemStock: 4800, actualStock: 4700, difference: -100, unitCost: 65, discrepancyValue: -6500, reason: 'Hao hụt dính muôi đong' },
        { id: 'sci-11', materialCode: 'MAT-MILK-01', materialName: 'Sữa tươi Đà Lạt Milk', unit: 'ml', systemStock: 9500, actualStock: 9500, difference: 0, unitCost: 30, discrepancyValue: 0 },
        { id: 'sci-12', materialCode: 'MAT-PKG-01', materialName: 'Vỏ ly nhựa PP 500ml', unit: 'cái', systemStock: 510, actualStock: 508, difference: -2, unitCost: 850, discrepancyValue: -1700, reason: 'Hỏng mép' },
        { id: 'sci-13', materialCode: 'MAT-SUG-01', materialName: 'Nước đường mía', unit: 'ml', systemStock: 7500, actualStock: 7500, difference: 0, unitCost: 25, discrepancyValue: 0 },
        { id: 'sci-14', materialCode: 'MAT-PKG-03', materialName: 'Ống hút giấy', unit: 'cái', systemStock: 800, actualStock: 800, difference: 0, unitCost: 700, discrepancyValue: 0 },
      ],
    },
    {
      id: 'sc-003',
      code: 'SC-DD-0309-C',
      branchName: 'Chi nhánh Đống Đa - 54 Chùa Lộc',
      shiftName: 'Ca tối (14:30 - 22:30)',
      countedBy: 'Đặng Quốc Bảo (Quản lý)',
      countedDate: '03/09/2026 22:45',
      status: 'APPROVED',
      totalItems: 7,
      totalDiscrepancyValue: -15400,
      note: 'Đã ký duyệt biên bản hao hụt cuối ngày',
      items: [
        { id: 'sci-15', materialCode: 'MAT-TEA-02', materialName: 'Cốt Trà Sen Thượng Hạng', unit: 'ml', systemStock: 3000, actualStock: 3000, difference: 0, unitCost: 40, discrepancyValue: 0 },
        { id: 'sci-16', materialCode: 'MAT-TOP-01', materialName: 'Hạt sen Huế ninh đường', unit: 'g', systemStock: 1200, actualStock: 1100, difference: -100, unitCost: 80, discrepancyValue: -8000 },
        { id: 'sci-17', materialCode: 'MAT-MILK-03', materialName: 'Kem béo Macchiato', unit: 'ml', systemStock: 1800, actualStock: 1700, difference: -100, unitCost: 45, discrepancyValue: -4500 },
        { id: 'sci-18', materialCode: 'MAT-PKG-05', materialName: 'Nắp bật Macchiato', unit: 'cái', systemStock: 250, actualStock: 245, difference: -5, unitCost: 500, discrepancyValue: -2500 },
        { id: 'sci-19', materialCode: 'MAT-PKG-01', materialName: 'Vỏ ly nhựa PP 500ml', unit: 'cái', systemStock: 320, actualStock: 320, difference: 0, unitCost: 850, discrepancyValue: 0 },
        { id: 'sci-20', materialCode: 'MAT-SUG-01', materialName: 'Nước đường mía', unit: 'ml', systemStock: 4000, actualStock: 4000, difference: 0, unitCost: 25, discrepancyValue: 0 },
        { id: 'sci-21', materialCode: 'MAT-PKG-03', materialName: 'Ống hút giấy', unit: 'cái', systemStock: 400, actualStock: 399, difference: -1, unitCost: 700, discrepancyValue: -700 },
      ],
    },
  ];

  getTickets(query?: string): Observable<StockCountTicket[]> {
    let list = [...this.tickets];
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(t => t.code.toLowerCase().includes(q) || t.branchName.toLowerCase().includes(q) || t.countedBy.toLowerCase().includes(q));
    }
    return of(list).pipe(delay(200));
  }

  approveTicket(ticketId: string): Observable<StockCountTicket> {
    const item = this.tickets.find(t => t.id === ticketId);
    if (item) {
      item.status = 'APPROVED';
      return of(item).pipe(delay(250));
    }
    throw new Error('Not found');
  }
}
