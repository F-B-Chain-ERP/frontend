import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { CountItemPayload, CreateCountPayload, StockCount, StockCountFilter, StockCountListResponse } from './stock-count-real.model';

interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: StockCount[];
}

/**
 * API kiểm kê: /api/v1/inv/stock-counts.
 * Luồng: DRAFT -> start -> IN_PROGRESS -> complete -> COMPLETED -> adjust -> ADJUSTED.
 * Xóa chỉ DRAFT. Tạo bắt buộc danh sách dòng kèm số đếm (không snapshot toàn bộ).
 */
@Injectable({
  providedIn: 'root',
})
export class StockCountService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/stock-counts');
  }

  getCounts(filter: StockCountFilter): Observable<StockCountListResponse> {
    let params = new HttpParams().set('page', String(Math.max((filter.pageIndex ?? 1) - 1, 0))).set('size', String(filter.pageSize ?? 10));
    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.warehouseId) {
      params = params.set('warehouseId', filter.warehouseId);
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

  getCountById(id: string): Observable<StockCount> {
    return this.http.get<ApiResponse<StockCount>>(`${this.baseUrl}/${id}`).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  createCount(payload: CreateCountPayload): Observable<StockCount> {
    return this.http.post<ApiResponse<StockCount>>(this.baseUrl, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  updateCount(id: string, payload: { note?: string | null; items?: CountItemPayload[] | null }): Observable<StockCount> {
    return this.http.put<ApiResponse<StockCount>>(`${this.baseUrl}/${id}`, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  deleteCount(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`).pipe(
      map(() => true),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  startCount(id: string): Observable<StockCount> {
    return this.http.post<ApiResponse<StockCount>>(`${this.baseUrl}/${id}/start`, {}).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  completeCount(id: string): Observable<StockCount> {
    return this.http.post<ApiResponse<StockCount>>(`${this.baseUrl}/${id}/complete`, {}).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  adjustCount(id: string): Observable<StockCount> {
    return this.http.post<ApiResponse<StockCount>>(`${this.baseUrl}/${id}/adjust`, {}).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  private errorMessage(err: unknown): string {
    const e = err as { error?: { message?: string; errorCode?: string }; message?: string };
    if (e?.error?.errorCode === 'CROSS_SCOPE_DENIED') {
      return 'Tài khoản chưa chọn chi nhánh làm việc nên không thấy dữ liệu. Vui lòng chọn chi nhánh hoặc liên hệ quản trị.';
    }
    return e?.error?.message || e?.message || 'Không thể kết nối tới máy chủ.';
  }
}
