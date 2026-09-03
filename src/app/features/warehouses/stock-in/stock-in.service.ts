import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  StockIn,
  StockInFilter,
  StockInListResponse,
  STOCK_IN_WAREHOUSE_OPTIONS,
} from './stock-in.model';

interface ApiEnvelope<T> {
  status: number;
  errorCode: string | null;
  message: string;
  data: T;
  timestamp: string;
}

interface PageEnvelope<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

/** 5 dữ liệu mẫu phiếu nhập kho theo yêu cầu */
export const INITIAL_MOCK_STOCK_IN: StockIn[] = [
  {
    id: 'sin-001',
    code: 'SI-202608-0001',
    warehouseId: 'wh-001',
    warehouseName: 'Kho Tổng',
    warehouse: {
      id: 'wh-001',
      code: 'KHO-TONG',
      name: 'Kho Tổng',
    },
    sourceType: 'PURCHASE',
    sourceReferenceId: 'po-001',
    sourceReferenceCode: 'PO-202608-0012',
    inDate: '2026-08-30',
    status: 'DRAFT',
    receivedBy: null,
    receivedByName: null,
    postedAt: null,
    note: 'Nhập hàng đợt 1 theo đơn mua hàng sữa tươi thanh trùng',
    createdAt: '2026-08-30T08:30:00Z',
    items: [
      {
        id: 'sii-001',
        purchaseOrderItemId: 'poi-001',
        materialId: 'mat-001',
        materialName: 'Sữa tươi',
        quantity: 80.0,
        unitPrice: 32000.0,
        batchNo: 'LOT-300826-A',
        expiryDate: '2026-09-15',
      },
    ],
  },
  {
    id: 'sin-002',
    code: 'SI-202608-0002',
    warehouseId: 'wh-001',
    warehouseName: 'Kho Tổng',
    warehouse: {
      id: 'wh-001',
      code: 'KHO-TONG',
      name: 'Kho Tổng',
    },
    sourceType: 'PURCHASE',
    sourceReferenceId: 'po-002',
    sourceReferenceCode: 'PO-202608-0015',
    inDate: '2026-08-31',
    status: 'POSTED',
    receivedBy: 'acc-002',
    receivedByName: 'Trần Thị Kiểm Soát',
    postedAt: '2026-08-31T09:30:00Z',
    note: 'Nhập kho cà phê hạt và đường đen Hàn Quốc',
    createdAt: '2026-08-31T09:15:00Z',
    items: [
      {
        id: 'sii-002',
        purchaseOrderItemId: 'poi-002',
        materialId: 'mat-002',
        materialName: 'Cà phê hạt Robusta Đắk Lắk',
        quantity: 50.0,
        unitPrice: 150000.0,
        batchNo: 'LOT-310826-CF',
        expiryDate: '2027-08-31',
      },
      {
        id: 'sii-003',
        purchaseOrderItemId: 'poi-003',
        materialId: 'mat-003',
        materialName: 'Đường đen Hàn Quốc',
        quantity: 30.0,
        unitPrice: 45000.0,
        batchNo: 'LOT-310826-SG',
        expiryDate: '2027-02-28',
      },
    ],
  },
  {
    id: 'sin-003',
    code: 'SI-202609-0001',
    warehouseId: 'wh-002',
    warehouseName: 'Kho nguyên liệu Đà Nẵng',
    warehouse: {
      id: 'wh-002',
      code: 'KHO-DN',
      name: 'Kho nguyên liệu Đà Nẵng',
    },
    sourceType: 'TRANSFER_IN',
    sourceReferenceId: 'trf-001',
    sourceReferenceCode: 'TRF-202608-0005',
    inDate: '2026-09-01',
    status: 'POSTED',
    receivedBy: 'acc-003',
    receivedByName: 'Lê Hoàng Nam',
    postedAt: '2026-09-01T14:30:00Z',
    note: 'Điều chuyển nguyên liệu từ Kho tổng Hà Nội về Đà Nẵng',
    createdAt: '2026-09-01T14:00:00Z',
    items: [
      {
        id: 'sii-004',
        purchaseOrderItemId: null,
        materialId: 'mat-004',
        materialName: 'Trân châu đen cao cấp',
        quantity: 100.0,
        unitPrice: 38000.0,
        batchNo: 'LOT-010926-TC',
        expiryDate: '2026-12-01',
      },
    ],
  },
  {
    id: 'sin-004',
    code: 'SI-202609-0002',
    warehouseId: 'wh-003',
    warehouseName: 'Kho lạnh TP.HCM',
    warehouse: {
      id: 'wh-003',
      code: 'KHO-HCM',
      name: 'Kho lạnh TP.HCM',
    },
    sourceType: 'RETURN',
    sourceReferenceId: 'ret-001',
    sourceReferenceCode: 'RET-202609-0001',
    inDate: '2026-09-02',
    status: 'DRAFT',
    receivedBy: null,
    receivedByName: 'Phạm Minh Đức',
    postedAt: null,
    note: 'Chi nhánh Quận 1 hoàn trả trân châu đen do dư định mức ca',
    createdAt: '2026-09-02T16:20:00Z',
    items: [
      {
        id: 'sii-005',
        purchaseOrderItemId: null,
        materialId: 'mat-004',
        materialName: 'Trân châu đen cao cấp',
        quantity: 10.0,
        unitPrice: 38000.0,
        batchNo: 'LOT-010926-TC',
        expiryDate: '2026-12-01',
      },
    ],
  },
  {
    id: 'sin-005',
    code: 'SI-202609-0003',
    warehouseId: 'wh-001',
    warehouseName: 'Kho Tổng',
    warehouse: {
      id: 'wh-001',
      code: 'KHO-TONG',
      name: 'Kho Tổng',
    },
    sourceType: 'ADJUSTMENT',
    sourceReferenceId: 'stc-001',
    sourceReferenceCode: 'STC-202609-0001',
    inDate: '2026-09-03',
    status: 'CANCELLED',
    receivedBy: null,
    receivedByName: 'Nguyễn Văn Quản Kho',
    postedAt: null,
    note: 'Điều chỉnh số lượng kiểm kê định kỳ cuối tháng (Đã hủy do lập sai kho)',
    createdAt: '2026-09-03T10:00:00Z',
    items: [
      {
        id: 'sii-006',
        purchaseOrderItemId: null,
        materialId: 'mat-005',
        materialName: 'Ly nhựa nắp tim 500ml',
        quantity: 20.0,
        unitPrice: 550000.0,
        batchNo: 'LOT-030926-LY',
        expiryDate: null,
      },
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class StockInService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** Bộ nhớ in-memory fallback */
  private memoryStockIn: StockIn[] = [...INITIAL_MOCK_STOCK_IN];

  private get stockInApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/stock-in');
  }

  getStockInList(filter: StockInFilter): Observable<StockInListResponse> {
    let params = new HttpParams()
      .set('page', String((filter.pageIndex || 1) - 1))
      .set('size', String(filter.pageSize || 10));

    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }

    return this.http.get<ApiEnvelope<PageEnvelope<StockIn>>>(this.stockInApi, { params }).pipe(
      map(res => {
        const page = res.data;
        const items = (page?.content ?? []).map(r => this.enrichWarehouseName(r));
        return {
          items,
          total: page?.totalElements ?? items.length,
          pageIndex: filter.pageIndex,
          pageSize: filter.pageSize,
        };
      }),
      catchError(() => {
        return of(this.filterMockStockIn(filter));
      }),
    );
  }

  getStockInById(id: string): Observable<StockIn | null> {
    return this.http.get<ApiEnvelope<StockIn>>(`${this.stockInApi}/${id}`).pipe(
      map(res => (res.data ? this.enrichWarehouseName(res.data) : null)),
      catchError(() => {
        const found = this.memoryStockIn.find(item => item.id === id) ?? null;
        return of(found);
      }),
    );
  }

  createStockIn(payload: Partial<StockIn>): Observable<StockIn> {
    return this.http.post<ApiEnvelope<StockIn>>(this.stockInApi, payload).pipe(
      map(res => this.enrichWarehouseName(res.data)),
      catchError(() => {
        const newId = `sin-${Date.now().toString().slice(-4)}`;
        const newItem: StockIn = {
          id: newId,
          code: payload.code || `SI-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Date.now().toString().slice(-4)}`,
          warehouseId: payload.warehouseId || 'wh-001',
          sourceType: payload.sourceType || 'PURCHASE',
          sourceReferenceCode: payload.sourceReferenceCode || '',
          inDate: payload.inDate || new Date().toISOString().slice(0, 10),
          status: payload.status || 'DRAFT',
          note: payload.note || '',
          receivedByName: 'Người dùng hiện tại',
          createdAt: new Date().toISOString(),
        };
        const enriched = this.enrichWarehouseName(newItem);
        this.memoryStockIn.unshift(enriched);
        return of(enriched);
      }),
    );
  }

  updateStockIn(id: string, payload: Partial<StockIn>): Observable<StockIn> {
    return this.http.put<ApiEnvelope<StockIn>>(`${this.stockInApi}/${id}`, payload).pipe(
      map(res => this.enrichWarehouseName(res.data)),
      catchError(() => {
        const index = this.memoryStockIn.findIndex(item => item.id === id);
        if (index >= 0) {
          const updated: StockIn = {
            ...this.memoryStockIn[index],
            ...payload,
            updatedAt: new Date().toISOString(),
          };
          this.memoryStockIn[index] = this.enrichWarehouseName(updated);
          return of(this.memoryStockIn[index]);
        }
        return of(this.enrichWarehouseName({ id, ...payload } as StockIn));
      }),
    );
  }

  deleteStockIn(id: string): Observable<boolean> {
    return this.http.delete<ApiEnvelope<void>>(`${this.stockInApi}/${id}`).pipe(
      map(() => true),
      catchError(() => {
        this.memoryStockIn = this.memoryStockIn.filter(item => item.id !== id);
        return of(true);
      }),
    );
  }

  batchDeleteStockIn(ids: string[]): Observable<boolean> {
    const idSet = new Set(ids);
    this.memoryStockIn = this.memoryStockIn.filter(item => !idSet.has(item.id));
    return of(true);
  }

  private filterMockStockIn(filter: StockInFilter): StockInListResponse {
    let list = [...this.memoryStockIn];

    if (filter.query?.trim()) {
      const q = filter.query.trim().toLowerCase();
      list = list.filter(
        item =>
          item.code.toLowerCase().includes(q) ||
          (item.warehouseName && item.warehouseName.toLowerCase().includes(q)) ||
          (item.sourceReferenceCode && item.sourceReferenceCode.toLowerCase().includes(q)) ||
          (item.note && item.note.toLowerCase().includes(q)),
      );
    }

    if (filter.status) {
      list = list.filter(item => item.status === filter.status);
    }

    if (filter.warehouseId) {
      list = list.filter(item => item.warehouseId === filter.warehouseId);
    }

    if (filter.sourceType) {
      list = list.filter(item => item.sourceType === filter.sourceType);
    }

    if (filter.fromDate) {
      list = list.filter(item => item.inDate >= filter.fromDate!);
    }

    if (filter.toDate) {
      list = list.filter(item => item.inDate <= filter.toDate!);
    }

    const total = list.length;
    const pageIndex = filter.pageIndex || 1;
    const pageSize = filter.pageSize || 10;
    const startIndex = (pageIndex - 1) * pageSize;
    const items = list.slice(startIndex, startIndex + pageSize);

    return {
      items,
      total,
      pageIndex,
      pageSize,
    };
  }

  private enrichWarehouseName(item: StockIn): StockIn {
    const wh = STOCK_IN_WAREHOUSE_OPTIONS.find(w => w.value === item.warehouseId);
    const whName = item.warehouse?.name || item.warehouseName || wh?.label || item.warehouseId;
    return {
      ...item,
      warehouseName: whName,
      warehouse: item.warehouse || {
        id: item.warehouseId,
        code: wh?.value?.toUpperCase() || 'WH-HN',
        name: whName,
      },
    };
  }
}
