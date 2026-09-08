import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { StockBalance, StockBalanceFilter, StockBalanceListResponse } from './stock-balance.model';

/** Page BE trả về (pageNumber 0-based). */
interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: StockBalance[];
}

/** Đọc tồn kho: GET /api/v1/inv/stocks (read-only, quyền inv:stock_balance:view). */
@Injectable({
  providedIn: 'root',
})
export class StockBalanceService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/stocks');
  }

  getBalances(filter: StockBalanceFilter): Observable<StockBalanceListResponse> {
    let params = new HttpParams().set('page', String(Math.max((filter.pageIndex ?? 1) - 1, 0))).set('size', String(filter.pageSize ?? 10));
    if (filter.warehouseId) {
      params = params.set('warehouseId', filter.warehouseId);
    }
    if (filter.materialId) {
      params = params.set('materialId', filter.materialId);
    }
    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    return this.http.get<ApiResponse<BackendPageResponse>>(this.baseUrl, { params }).pipe(
      map(res => {
        const page = res.data;
        return {
          items: page?.content ?? [],
          total: page?.totalElements ?? 0,
          pageIndex: (page?.pageNumber ?? 0) + 1,
          pageSize: page?.pageSize ?? filter.pageSize ?? 10,
        };
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  getBalance(warehouseId: string, materialId: string): Observable<StockBalance | null> {
    return this.http
      .get<ApiResponse<StockBalance>>(`${this.baseUrl}/warehouse/${warehouseId}/material/${materialId}`)
      .pipe(
        map(res => res.data ?? null),
        catchError(() => throwError(() => new Error('Không thể tải tồn kho.'))),
      );
  }

  private errorMessage(err: unknown): string {
    const e = err as { error?: { message?: string; errorCode?: string }; message?: string };
    if (e?.error?.errorCode === 'CROSS_SCOPE_DENIED') {
      return 'Tài khoản chưa chọn chi nhánh làm việc nên không thấy tồn kho. Vui lòng chọn chi nhánh hoặc liên hệ quản trị.';
    }
    return e?.error?.message || e?.message || 'Không thể tải tồn kho.';
  }
}
