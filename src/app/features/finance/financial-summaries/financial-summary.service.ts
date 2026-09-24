import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  FinancialSummaryExpenseSource,
  FinancialSummaryOrderSource,
  FinancialSummaryRecord,
  FinancialSummaryRefundSource,
  FinancialSummarySourcePage,
  FinancialSummarySourceType,
} from './financial-summary.model';

/** Backend paginated response shape (FinancialSummaryController: /api/v1/fin/financial-summaries). */
interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: BackendFinancialSummary[];
}

/** Shape of a financial summary as returned by the backend. */
interface BackendFinancialSummary {
  id: string;
  branchId: string;
  branchName?: string;
  businessDate: string;
  grossRevenue: number;
  discountAmount: number;
  netRevenue: number;
  totalCogs: number;
  grossProfit: number;
  totalExpense: number;
  netProfit: number;
  orderCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Backend sources response shape. */
interface BackendSourcePage<T> {
  source: string;
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  items: T[];
}

export interface FinancialSummaryFilter {
  branchId?: string;
  fromDate?: string | null;
  toDate?: string | null;
  status?: string | null;
  sortBy?: string | null;
  sortDir?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface FinancialSummaryListResponse {
  items: FinancialSummaryRecord[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface BranchOption {
  id: string;
  name: string;
}

export type FinancialSummarySourceItem = FinancialSummaryOrderSource | FinancialSummaryRefundSource | FinancialSummaryExpenseSource;

/**
 * Kết nối với API thật của backend (FinancialSummaryController: /api/v1/fin/financial-summaries).
 */
@Injectable({ providedIn: 'root' })
export class FinancialSummaryService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/fin/financial-summaries');
  }

  getSummaries(filter: FinancialSummaryFilter): Observable<FinancialSummaryListResponse> {
    let params = new HttpParams()
      .set('page', String(Math.max((filter.pageIndex ?? 1) - 1, 0)))
      .set('size', String(filter.pageSize ?? 10))
      .set('sortBy', filter.sortBy ?? 'businessDate')
      .set('sortDir', filter.sortDir ?? 'desc');

    if (filter.branchId) {
      params = params.set('branchId', filter.branchId);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.fromDate) {
      params = params.set('fromDate', filter.fromDate);
    }
    if (filter.toDate) {
      params = params.set('toDate', filter.toDate);
    }

    return this.http.get<ApiResponse<BackendPageResponse>>(this.baseUrl, { params }).pipe(
      map(res => {
        const page = res.data;
        const content = page?.content ?? [];
        const items = content.map(s => this.toFinancialSummary(s));
        return {
          items,
          total: page?.totalElements ?? 0,
          pageIndex: (page?.pageNumber ?? 0) + 1,
          pageSize: page?.pageSize ?? filter.pageSize ?? 10,
        };
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  getFinancialSummary(id: string): Observable<FinancialSummaryRecord> {
    return this.http.get<ApiResponse<BackendFinancialSummary>>(`${this.baseUrl}/${id}`).pipe(
      map(res => this.toFinancialSummary(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  getSources(
    id: string,
    source: FinancialSummarySourceType,
    pageIndex: number,
    pageSize: number,
  ): Observable<FinancialSummarySourcePage<FinancialSummarySourceItem>> {
    const params = new HttpParams()
      .set('source', source)
      .set('page', String(Math.max((pageIndex ?? 1) - 1, 0)))
      .set('size', String(pageSize ?? 10));

    return this.http.get<ApiResponse<BackendSourcePage<FinancialSummarySourceItem>>>(`${this.baseUrl}/${id}/sources`, { params }).pipe(
      map(res => {
        const data = res.data;
        return {
          items: data?.items ?? [],
          total: data?.totalElements ?? 0,
          pageIndex: (data?.pageNumber ?? 0) + 1,
          pageSize: data?.pageSize ?? pageSize ?? 10,
        };
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  recalculate(branchId: string, businessDate: string): Observable<FinancialSummaryRecord> {
    return this.http.post<ApiResponse<BackendFinancialSummary>>(`${this.baseUrl}/recalculate`, { branchId, businessDate }).pipe(
      map(res => this.toFinancialSummary(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  finalize(id: string): Observable<FinancialSummaryRecord> {
    return this.http.post<ApiResponse<BackendFinancialSummary>>(`${this.baseUrl}/${id}/finalize`, {}).pipe(
      map(res => this.toFinancialSummary(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /** Chi nhánh trong phạm vi (scope) của tài khoản hiện tại — dùng cho dropdown lọc. */
  getBranchOptions(): Observable<BranchOption[]> {
    return this.http.get<ApiResponse<BranchOption[]>>(this.applicationConfigService.getEndpointFor('api/v1/branches/mine')).pipe(
      map(res => (res.data ?? []).map(b => ({ id: b.id, name: b.name }))),
      catchError(() => throwError(() => new Error('Không thể tải danh sách chi nhánh.'))),
    );
  }

  private toFinancialSummary(s: BackendFinancialSummary): FinancialSummaryRecord {
    return {
      id: s.id,
      branchId: s.branchId,
      branchName: s.branchName,
      businessDate: s.businessDate,
      grossRevenue: s.grossRevenue ?? 0,
      discountAmount: s.discountAmount ?? 0,
      netRevenue: s.netRevenue ?? 0,
      totalCogs: s.totalCogs ?? 0,
      grossProfit: s.grossProfit ?? 0,
      totalExpense: s.totalExpense ?? 0,
      netProfit: s.netProfit ?? 0,
      orderCount: s.orderCount ?? 0,
      status: s.status as FinancialSummaryRecord['status'],
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private errorMessage(err: unknown): string {
    const e = err as { status?: number; error?: { message?: string }; message?: string };
    if (e?.error?.message) return e.error.message;
    if (e?.message) return e.message;
    return 'Không thể kết nối tới máy chủ.';
  }
}
