import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  PurchaseOrder,
  PurchaseOrderFilter,
  PurchaseOrderFormDTO,
  PurchaseOrderListResponse,
  PurchaseOrderStatus,
  calcGrandTotal,
} from './po.model';

/**
 * TODO(S2-11): Hiện dùng mock data in-memory theo chuẩn màn mẫu users.
 * Khi backend có API, thay thân các method bằng HttpClient gọi /api/v1/...
 */
@Injectable({
  providedIn: 'root',
})
export class PurchaseOrderService {
  private mockOrders: PurchaseOrder[] = [
    {
      id: 'PO001',
      code: 'PO-2026-0001',
      supplierId: 'SUP001',
      supplierName: 'Công ty TNHH Nguyên liệu Phúc An',
      orderDate: '2026-08-01',
      expectedDate: '2026-08-05',
      status: PurchaseOrderStatus.APPROVED,
      items: [
        { id: 1, materialName: 'Cà phê nhân Robusta', unit: 'kg', quantity: 120, unitPrice: 85000 },
        { id: 2, materialName: 'Syrup caramel', unit: 'chai', quantity: 24, unitPrice: 145000 },
      ],
      totalAmount: 13680000,
      note: 'Đơn bổ sung NVL quý 3',
      createdAt: '2026-08-01 09:10:00',
      updatedAt: '2026-08-02 08:45:00',
    },
    {
      id: 'PO002',
      code: 'PO-2026-0002',
      supplierId: 'SUP002',
      supplierName: 'Nhà phân phối Sữa Sao Băng',
      orderDate: '2026-08-10',
      expectedDate: '2026-08-14',
      status: PurchaseOrderStatus.PENDING,
      items: [
        { id: 1, materialName: 'Sữa tươi thanh trùng', unit: 'thùng', quantity: 60, unitPrice: 320000 },
        { id: 2, materialName: 'Kem tươi', unit: 'hộp', quantity: 30, unitPrice: 275000 },
      ],
      totalAmount: 27450000,
      createdAt: '2026-08-10 10:30:00',
    },
    {
      id: 'PO003',
      code: 'PO-2026-0003',
      supplierId: 'SUP003',
      supplierName: 'Hợp tác xã Trà Thái Nguyên',
      orderDate: '2026-08-18',
      status: PurchaseOrderStatus.DRAFT,
      items: [{ id: 1, materialName: 'Trà xanh búp', unit: 'kg', quantity: 40, unitPrice: 210000 }],
      totalAmount: 8400000,
      note: 'Chờ xác nhận giá từ NCC',
      createdAt: '2026-08-18 15:20:00',
    },
    {
      id: 'PO004',
      code: 'PO-2026-0004',
      supplierId: 'SUP001',
      supplierName: 'Công ty TNHH Nguyên liệu Phúc An',
      orderDate: '2026-07-02',
      expectedDate: '2026-07-06',
      status: PurchaseOrderStatus.CANCELLED,
      items: [{ id: 1, materialName: 'Bột cacao', unit: 'kg', quantity: 25, unitPrice: 260000 }],
      totalAmount: 6500000,
      note: 'Hủy do NCC hết hàng',
      createdAt: '2026-07-02 11:00:00',
      updatedAt: '2026-07-03 09:15:00',
    },
  ];

  getPurchaseOrders(filter: PurchaseOrderFilter): Observable<PurchaseOrderListResponse> {
    let result = [...this.mockOrders];

    if (filter.query?.trim()) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter(
        po =>
          po.code?.toLowerCase().includes(q) ||
          po.supplierName?.toLowerCase().includes(q) ||
          (po.items ?? []).some(i => i.materialName?.toLowerCase().includes(q)),
      );
    }

    if (filter.status !== null && filter.status !== undefined) {
      const statusFilter = filter.status;
      result = result.filter(po => po.status === statusFilter);
    }

    if (filter.sortField) {
      const key = filter.sortField as keyof PurchaseOrder;
      const isAsc = filter.sortOrder === 'ascend';
      const valOf = (po: PurchaseOrder): string => {
        const value = po[key];
        return typeof value === 'number' || typeof value === 'string' ? String(value) : '';
      };
      result.sort((a, b) => (isAsc ? valOf(a).localeCompare(valOf(b)) : valOf(b).localeCompare(valOf(a))));
    } else {
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    const total = result.length;
    const pageIndex = filter.pageIndex && filter.pageIndex > 0 ? filter.pageIndex : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 10;
    const startIndex = (pageIndex - 1) * pageSize;
    const items = result.slice(startIndex, startIndex + pageSize);

    return of({ items, total, pageIndex, pageSize }).pipe(delay(200));
  }

  getPurchaseOrderById(id: string | number): Observable<PurchaseOrder | null> {
    const order = this.mockOrders.find(po => String(po.id) === String(id));
    return of(order ? { ...order, items: [...order.items] } : null).pipe(delay(150));
  }

  createPurchaseOrder(dto: PurchaseOrderFormDTO): Observable<PurchaseOrder> {
    const now = this.formatDate(new Date());
    const nextSeq = this.mockOrders.length + 1;
    const newId = `PO${String(nextSeq).padStart(3, '0')}`;

    const newOrder: PurchaseOrder = {
      id: newId,
      code: dto.code || `PO-2026-${String(nextSeq).padStart(4, '0')}`,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      orderDate: dto.orderDate,
      expectedDate: dto.expectedDate || '',
      status: dto.status ?? PurchaseOrderStatus.DRAFT,
      items: [...dto.items],
      totalAmount: calcGrandTotal(dto.items),
      note: (dto.note || '').trim(),
      createdAt: now,
      updatedAt: now,
    };

    this.mockOrders.unshift(newOrder);
    return of(newOrder).pipe(delay(300));
  }

  updatePurchaseOrder(id: string | number, dto: Partial<PurchaseOrderFormDTO>): Observable<PurchaseOrder> {
    const index = this.mockOrders.findIndex(po => String(po.id) === String(id));
    if (index === -1) {
      return throwError(() => new Error('Đơn mua hàng không tồn tại'));
    }

    const current = this.mockOrders[index];
    const items = dto.items !== undefined ? [...dto.items] : current.items;
    const updatedOrder: PurchaseOrder = {
      ...current,
      code: dto.code !== undefined ? dto.code : current.code,
      supplierId: dto.supplierId !== undefined ? dto.supplierId : current.supplierId,
      supplierName: dto.supplierName !== undefined ? dto.supplierName : current.supplierName,
      orderDate: dto.orderDate !== undefined ? dto.orderDate : current.orderDate,
      expectedDate: dto.expectedDate !== undefined ? dto.expectedDate : current.expectedDate,
      status: dto.status !== undefined ? dto.status : current.status,
      items,
      totalAmount: calcGrandTotal(items),
      note: dto.note !== undefined ? dto.note.trim() : current.note,
      updatedAt: this.formatDate(new Date()),
    };

    this.mockOrders[index] = updatedOrder;
    return of(updatedOrder).pipe(delay(300));
  }

  changeStatus(id: string | number, status: PurchaseOrderStatus): Observable<PurchaseOrder> {
    const order = this.mockOrders.find(po => String(po.id) === String(id));
    if (!order) {
      return throwError(() => new Error('Đơn mua hàng không tồn tại'));
    }
    return this.updatePurchaseOrder(id, { status });
  }

  approve(id: string | number): Observable<PurchaseOrder> {
    return this.changeStatus(id, PurchaseOrderStatus.APPROVED);
  }

  cancel(id: string | number): Observable<PurchaseOrder> {
    return this.changeStatus(id, PurchaseOrderStatus.CANCELLED);
  }

  deletePurchaseOrder(id: string | number): Observable<boolean> {
    const initialLen = this.mockOrders.length;
    this.mockOrders = this.mockOrders.filter(po => String(po.id) !== String(id));
    return of(this.mockOrders.length < initialLen).pipe(delay(250));
  }

  deleteBatch(ids: (string | number)[]): Observable<boolean> {
    const idSet = new Set(ids.map(String));
    this.mockOrders = this.mockOrders.filter(po => !idSet.has(String(po.id)));
    return of(true).pipe(delay(300));
  }

  /**
   * Sinh mã PO kế tiếp theo năm hiện tại (dùng cho form tạo mới)
   */
  generateNextCode(): Observable<string> {
    return of(this.mockOrders.length + 1).pipe(map(seq => `PO-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`));
  }

  private formatDate(date: Date): string {
    const pad = (n: number): string => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
  }
}
