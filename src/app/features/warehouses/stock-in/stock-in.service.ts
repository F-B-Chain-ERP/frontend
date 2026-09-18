import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { StockIn, StockInFilter, StockInItem, StockInListResponse } from './stock-in.model';

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

@Injectable({
  providedIn: 'root',
})
export class StockInService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get stockInApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/stock-ins');
  }

  getStockInList(filter: StockInFilter): Observable<StockInListResponse> {
    let params = new HttpParams()
      .set('page', String((filter.pageIndex || 1) - 1))
      .set('size', String(filter.pageSize || 10));

    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.warehouseId) {
      params = params.set('warehouseId', filter.warehouseId);
    }
    if (filter.sourceType) {
      params = params.set('sourceType', filter.sourceType);
    }
    if (filter.fromDate) {
      params = params.set('fromDate', filter.fromDate);
    }
    if (filter.toDate) {
      params = params.set('toDate', filter.toDate);
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
    );
  }

  getStockInById(id: string): Observable<StockIn | null> {
    return this.http
      .get<ApiEnvelope<StockIn>>(`${this.stockInApi}/${id}`)
      .pipe(map(res => (res.data ? this.enrichWarehouseName(res.data) : null)));
  }

  createStockIn(payload: Partial<StockIn>): Observable<StockIn> {
    const { code, status, items, ...body } = payload as Record<string, unknown>;
    void code;
    void status;
    return this.http
      .post<ApiEnvelope<StockIn>>(this.stockInApi, { ...body, items: this.sanitizeStockInItems(items as StockInItem[]) })
      .pipe(map(res => this.enrichWarehouseName(res.data)));
  }

  updateStockIn(id: string, payload: Partial<StockIn>): Observable<StockIn> {
    const { code, status, items, ...body } = payload as Record<string, unknown>;
    void code;
    void status;
    return this.http
      .put<ApiEnvelope<StockIn>>(`${this.stockInApi}/${id}`, { ...body, items: this.sanitizeStockInItems(items as StockInItem[]) })
      .pipe(map(res => this.enrichWarehouseName(res.data)));
  }

  private sanitizeStockInItems(items?: (Partial<StockInItem> | undefined)[]): unknown[] {
    return (items ?? []).map(it => {
      if (!it) return it;
      const { id, materialName, ...rest } = it;
      void id;
      void materialName;
      const clean = { ...rest } as Record<string, unknown>;
      if (clean['expiryDate'] === '') clean['expiryDate'] = null;
      if (clean['batchNo'] === '') clean['batchNo'] = null;
      if (clean['purchaseOrderItemId'] === '') clean['purchaseOrderItemId'] = null;
      return clean;
    });
  }

  changeStatus(id: string, status: 'POSTED' | 'CANCELLED'): Observable<StockIn> {
    return this.http
      .patch<ApiEnvelope<StockIn>>(`${this.stockInApi}/${id}/status`, { status })
      .pipe(map(res => this.enrichWarehouseName(res.data)));
  }

  private enrichWarehouseName(item: StockIn): StockIn {
    const whName = item.warehouse?.name || item.warehouseName || item.warehouseId;
    return {
      ...item,
      warehouseName: whName,
      warehouse: item.warehouse || {
        id: item.warehouseId,
        code: item.warehouseId,
        name: whName,
      },
    };
  }
}
