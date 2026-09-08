import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  CreateTransferPayload,
  ReceiveTransferItemPayload,
  StockTransfer,
  StockTransferFilter,
  StockTransferListResponse,
} from './stock-transfer.model';

interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: StockTransfer[];
}

/**
 * API chuyển kho: /api/v1/inv/transfers.
 * Luồng: PENDING -> dispatch -> IN_TRANSIT -> receive (nhiều đợt) -> RECEIVED,
 * PENDING/IN_TRANSIT -> cancel (IN_TRANSIT bắt buộc lý do).
 */
@Injectable({
  providedIn: 'root',
})
export class StockTransferService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/transfers');
  }

  getTransfers(filter: StockTransferFilter): Observable<StockTransferListResponse> {
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

  getTransferById(id: string): Observable<StockTransfer> {
    return this.http.get<ApiResponse<StockTransfer>>(`${this.baseUrl}/${id}`).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  createTransfer(payload: CreateTransferPayload): Observable<StockTransfer> {
    return this.http.post<ApiResponse<StockTransfer>>(this.baseUrl, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  updateTransfer(id: string, payload: CreateTransferPayload): Observable<StockTransfer> {
    return this.http.put<ApiResponse<StockTransfer>>(`${this.baseUrl}/${id}`, payload).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  dispatchTransfer(id: string): Observable<StockTransfer> {
    return this.http.post<ApiResponse<StockTransfer>>(`${this.baseUrl}/${id}/dispatch`, {}).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  receiveTransfer(id: string, items: ReceiveTransferItemPayload[]): Observable<StockTransfer> {
    return this.http.post<ApiResponse<StockTransfer>>(`${this.baseUrl}/${id}/receive`, { items }).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  cancelTransfer(id: string, reason?: string | null): Observable<StockTransfer> {
    return this.http.post<ApiResponse<StockTransfer>>(`${this.baseUrl}/${id}/cancel`, { reason: reason ?? null }).pipe(
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
