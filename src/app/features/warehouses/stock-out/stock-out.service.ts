import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  StockOut,
  StockOutFilter,
  StockOutListResponse,
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

@Injectable({
  providedIn: 'root',
})
export class StockOutService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get stockOutApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/stock-outs');
  }

  getStockOutList(filter: StockOutFilter): Observable<StockOutListResponse> {
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
    if (filter.destinationType) {
      params = params.set('destinationType', filter.destinationType);
    }
    if (filter.fromDate) {
      params = params.set('fromDate', filter.fromDate);
    }
    if (filter.toDate) {
      params = params.set('toDate', filter.toDate);
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
    );
  }

  getStockOutById(id: string): Observable<StockOut | null> {
    return this.http
      .get<ApiEnvelope<StockOut>>(`${this.stockOutApi}/${id}`)
      .pipe(map(res => (res.data ? this.enrichWarehouseName(res.data) : null)));
  }

  createStockOut(payload: Partial<StockOut>): Observable<StockOut> {
    const { code, status, ...body } = payload as Record<string, unknown>;
    void code;
    void status;
    return this.http
      .post<ApiEnvelope<StockOut>>(this.stockOutApi, body)
      .pipe(map(res => this.enrichWarehouseName(res.data)));
  }

  updateStockOut(id: string, payload: Partial<StockOut>): Observable<StockOut> {
    const { code, status, ...body } = payload as Record<string, unknown>;
    void code;
    void status;
    return this.http
      .put<ApiEnvelope<StockOut>>(`${this.stockOutApi}/${id}`, body)
      .pipe(map(res => this.enrichWarehouseName(res.data)));
  }

  changeStatus(id: string, status: 'POSTED' | 'CANCELLED'): Observable<StockOut> {
    return this.http
      .patch<ApiEnvelope<StockOut>>(`${this.stockOutApi}/${id}/status`, { status })
      .pipe(map(res => this.enrichWarehouseName(res.data)));
  }

  private enrichWarehouseName(item: StockOut): StockOut {
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
