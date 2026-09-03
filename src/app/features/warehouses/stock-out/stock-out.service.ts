import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  StockOut,
  StockOutFilter,
  StockOutListResponse,
  STOCK_OUT_WAREHOUSE_OPTIONS,
} from './stock-out.model';

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

/** 5 dữ liệu mẫu phiếu xuất kho theo yêu cầu */
export const INITIAL_MOCK_STOCK_OUT: StockOut[] = [
  {
    id: 'sout-001',
    code: 'SO-202608-0001',
    warehouseId: 'wh-001',
    warehouseName: 'Kho Tổng',
    warehouse: {
      id: 'wh-001',
      code: 'KHO-TONG',
      name: 'Kho Tổng',
    },
    destinationType: 'BRANCH_ISSUE',
    destinationReferenceId: 'branch-001',
    destinationReferenceCode: 'REQ-CN-0012',
    outDate: '2026-08-30',
    status: 'DRAFT',
    issuedBy: null,
    issuedByName: null,
    postedAt: null,
    note: 'Xuất nguyên liệu sữa tươi cho Chi nhánh Cầu Giấy',
    createdAt: '2026-08-30T10:00:00Z',
    items: [
      {
        id: 'soi-001',
        materialId: 'mat-001',
        materialName: 'Sữa tươi',
        quantity: 20.0,
        unitPrice: 32000.0,
        batchNo: 'LOT-300826-A',
      },
    ],
  },
  {
    id: 'sout-002',
    code: 'SO-202608-0002',
    warehouseId: 'wh-001',
    warehouseName: 'Kho Tổng',
    warehouse: {
      id: 'wh-001',
      code: 'KHO-TONG',
      name: 'Kho Tổng',
    },
    destinationType: 'BRANCH_ISSUE',
    destinationReferenceId: 'branch-002',
    destinationReferenceCode: 'REQ-CN-0015',
    outDate: '2026-08-31',
    status: 'POSTED',
    issuedBy: 'acc-002',
    issuedByName: 'Trần Thị Kiểm Soát',
    postedAt: '2026-08-31T14:45:00Z',
    note: 'Xuất cà phê hạt Robusta và trân châu đen cho Chi nhánh Hoàn Kiếm',
    createdAt: '2026-08-31T14:30:00Z',
    items: [
      {
        id: 'soi-002',
        materialId: 'mat-002',
        materialName: 'Cà phê hạt Robusta Đắk Lắk',
        quantity: 15.0,
        unitPrice: 150000.0,
        batchNo: 'LOT-310826-CF',
      },
      {
        id: 'soi-003',
        materialId: 'mat-004',
        materialName: 'Trân châu đen cao cấp',
        quantity: 25.0,
        unitPrice: 38000.0,
        batchNo: 'LOT-310826-TC',
      },
    ],
  },
  {
    id: 'sout-003',
    code: 'SO-202609-0001',
    warehouseId: 'wh-002',
    warehouseName: 'Kho nguyên liệu Đà Nẵng',
    warehouse: {
      id: 'wh-002',
      code: 'KHO-DN',
      name: 'Kho nguyên liệu Đà Nẵng',
    },
    destinationType: 'TRANSFER_OUT',
    destinationReferenceId: 'wh-003',
    destinationReferenceCode: 'TRF-OUT-0004',
    outDate: '2026-09-01',
    status: 'POSTED',
    issuedBy: 'acc-003',
    issuedByName: 'Lê Hoàng Nam',
    postedAt: '2026-09-01T09:30:00Z',
    note: 'Xuất điều chuyển đường đen Hàn Quốc và ly nhựa sang Kho lạnh TP.HCM',
    createdAt: '2026-09-01T09:00:00Z',
    items: [
      {
        id: 'soi-004',
        materialId: 'mat-003',
        materialName: 'Đường đen Hàn Quốc',
        quantity: 20.0,
        unitPrice: 45000.0,
        batchNo: 'LOT-010926-SG',
      },
    ],
  },
  {
    id: 'sout-004',
    code: 'SO-202609-0002',
    warehouseId: 'wh-003',
    warehouseName: 'Kho lạnh TP.HCM',
    warehouse: {
      id: 'wh-003',
      code: 'KHO-HCM',
      name: 'Kho lạnh TP.HCM',
    },
    destinationType: 'PRODUCTION_ISSUE',
    destinationReferenceId: 'prod-001',
    destinationReferenceCode: 'PROD-202609-01',
    outDate: '2026-09-02',
    status: 'DRAFT',
    issuedBy: null,
    issuedByName: 'Phạm Minh Đức',
    postedAt: null,
    note: 'Xuất trà và nguyên liệu sơ chế cho xưởng sản xuất bánh & đồ uống',
    createdAt: '2026-09-02T11:15:00Z',
    items: [
      {
        id: 'soi-005',
        materialId: 'mat-001',
        materialName: 'Sữa tươi',
        quantity: 30.0,
        unitPrice: 32000.0,
        batchNo: 'LOT-300826-A',
      },
    ],
  },
  {
    id: 'sout-005',
    code: 'SO-202609-0003',
    warehouseId: 'wh-001',
    warehouseName: 'Kho Tổng',
    warehouse: {
      id: 'wh-001',
      code: 'KHO-TONG',
      name: 'Kho Tổng',
    },
    destinationType: 'WASTAGE',
    destinationReferenceId: null,
    destinationReferenceCode: 'WASTE-202609-01',
    outDate: '2026-09-03',
    status: 'CANCELLED',
    issuedBy: null,
    issuedByName: 'Nguyễn Văn Quản Kho',
    postedAt: null,
    note: 'Xuất hủy lô vỏ ly nắp tim lỗi nhà máy (Đã hủy do hoàn trả NCC đổi trả)',
    createdAt: '2026-09-03T16:00:00Z',
    items: [
      {
        id: 'soi-006',
        materialId: 'mat-005',
        materialName: 'Ly nhựa nắp tim 500ml',
        quantity: 5.0,
        unitPrice: 550000.0,
        batchNo: 'LOT-030926-LY',
      },
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class StockOutService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** Bộ nhớ in-memory fallback */
  private memoryStockOut: StockOut[] = [...INITIAL_MOCK_STOCK_OUT];

  private get stockOutApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/stock-out');
  }

  getStockOutList(filter: StockOutFilter): Observable<StockOutListResponse> {
    let params = new HttpParams()
      .set('page', String((filter.pageIndex || 1) - 1))
      .set('size', String(filter.pageSize || 10));

    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }

    return this.http.get<ApiEnvelope<PageEnvelope<StockOut>>>(this.stockOutApi, { params }).pipe(
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
        return of(this.filterMockStockOut(filter));
      }),
    );
  }

  getStockOutById(id: string): Observable<StockOut | null> {
    return this.http.get<ApiEnvelope<StockOut>>(`${this.stockOutApi}/${id}`).pipe(
      map(res => (res.data ? this.enrichWarehouseName(res.data) : null)),
      catchError(() => {
        const found = this.memoryStockOut.find(item => item.id === id) ?? null;
        return of(found);
      }),
    );
  }

  createStockOut(payload: Partial<StockOut>): Observable<StockOut> {
    return this.http.post<ApiEnvelope<StockOut>>(this.stockOutApi, payload).pipe(
      map(res => this.enrichWarehouseName(res.data)),
      catchError(() => {
        const newId = `sout-${Date.now().toString().slice(-4)}`;
        const newItem: StockOut = {
          id: newId,
          code: payload.code || `SO-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Date.now().toString().slice(-4)}`,
          warehouseId: payload.warehouseId || 'wh-001',
          destinationType: payload.destinationType || 'BRANCH_ISSUE',
          destinationReferenceCode: payload.destinationReferenceCode || '',
          outDate: payload.outDate || new Date().toISOString().slice(0, 10),
          status: payload.status || 'DRAFT',
          note: payload.note || '',
          issuedByName: 'Người dùng hiện tại',
          createdAt: new Date().toISOString(),
        };
        const enriched = this.enrichWarehouseName(newItem);
        this.memoryStockOut.unshift(enriched);
        return of(enriched);
      }),
    );
  }

  updateStockOut(id: string, payload: Partial<StockOut>): Observable<StockOut> {
    return this.http.put<ApiEnvelope<StockOut>>(`${this.stockOutApi}/${id}`, payload).pipe(
      map(res => this.enrichWarehouseName(res.data)),
      catchError(() => {
        const index = this.memoryStockOut.findIndex(item => item.id === id);
        if (index >= 0) {
          const updated: StockOut = {
            ...this.memoryStockOut[index],
            ...payload,
            updatedAt: new Date().toISOString(),
          };
          this.memoryStockOut[index] = this.enrichWarehouseName(updated);
          return of(this.memoryStockOut[index]);
        }
        return of(this.enrichWarehouseName({ id, ...payload } as StockOut));
      }),
    );
  }

  deleteStockOut(id: string): Observable<boolean> {
    return this.http.delete<ApiEnvelope<void>>(`${this.stockOutApi}/${id}`).pipe(
      map(() => true),
      catchError(() => {
        this.memoryStockOut = this.memoryStockOut.filter(item => item.id !== id);
        return of(true);
      }),
    );
  }

  batchDeleteStockOut(ids: string[]): Observable<boolean> {
    const idSet = new Set(ids);
    this.memoryStockOut = this.memoryStockOut.filter(item => !idSet.has(item.id));
    return of(true);
  }

  private filterMockStockOut(filter: StockOutFilter): StockOutListResponse {
    let list = [...this.memoryStockOut];

    if (filter.query?.trim()) {
      const q = filter.query.trim().toLowerCase();
      list = list.filter(
        item =>
          item.code.toLowerCase().includes(q) ||
          (item.warehouseName && item.warehouseName.toLowerCase().includes(q)) ||
          (item.destinationReferenceCode && item.destinationReferenceCode.toLowerCase().includes(q)) ||
          (item.note && item.note.toLowerCase().includes(q)),
      );
    }

    if (filter.status) {
      list = list.filter(item => item.status === filter.status);
    }

    if (filter.warehouseId) {
      list = list.filter(item => item.warehouseId === filter.warehouseId);
    }

    if (filter.destinationType) {
      list = list.filter(item => item.destinationType === filter.destinationType);
    }

    if (filter.fromDate) {
      list = list.filter(item => item.outDate >= filter.fromDate!);
    }

    if (filter.toDate) {
      list = list.filter(item => item.outDate <= filter.toDate!);
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

  private enrichWarehouseName(item: StockOut): StockOut {
    const wh = STOCK_OUT_WAREHOUSE_OPTIONS.find(w => w.value === item.warehouseId);
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
