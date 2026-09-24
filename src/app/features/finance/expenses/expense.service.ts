import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ExpenseCreatePayload, ExpenseRecord, ExpenseUpdatePayload } from './expense.model';

/** Backend paginated response shape (ExpenseController: /api/v1/fin/expenses). */
interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: BackendExpense[];
}

/** Shape of an expense as returned by the backend. */
interface BackendExpense {
  id: string;
  branchId?: string;
  branchName?: string;
  expenseDate: string;
  expenseCategory: string;
  amount: number;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFilter {
  query?: string;
  branchId?: string;
  status?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  sortBy?: string | null;
  sortDir?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface ExpenseListResponse {
  items: ExpenseRecord[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface BranchOption {
  id: string;
  name: string;
}

/**
 * Kết nối với API thật của backend (ExpenseController: /api/v1/fin/expenses).
 */
@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/fin/expenses');
  }

  getExpenses(filter: ExpenseFilter): Observable<ExpenseListResponse> {
    let params = new HttpParams()
      .set('page', String(Math.max((filter.pageIndex ?? 1) - 1, 0)))
      .set('size', String(filter.pageSize ?? 10));

    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.branchId) {
      params = params.set('branchId', filter.branchId);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.dateFrom) {
      params = params.set('dateFrom', filter.dateFrom);
    }
    if (filter.dateTo) {
      params = params.set('dateTo', filter.dateTo);
    }
    if (filter.sortBy) {
      params = params.set('sortBy', filter.sortBy);
    }
    if (filter.sortDir) {
      params = params.set('sortDir', filter.sortDir);
    }

    return this.http.get<ApiResponse<BackendPageResponse>>(this.baseUrl, { params }).pipe(
      map(res => {
        const page = res.data;
        const content = page?.content ?? [];
        const items = content.map(e => this.toExpense(e));
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

  createExpense(body: ExpenseCreatePayload): Observable<ExpenseRecord> {
    return this.http.post<ApiResponse<BackendExpense>>(this.baseUrl, body).pipe(
      map(res => this.toExpense(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  updateExpense(id: string, body: ExpenseUpdatePayload): Observable<ExpenseRecord> {
    return this.http.put<ApiResponse<BackendExpense>>(`${this.baseUrl}/${id}`, body).pipe(
      map(res => this.toExpense(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  deleteExpense(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /** Chi nhánh trong phạm vi (scope) của tài khoản hiện tại — dùng cho dropdown lọc/tạo/sửa. */
  getBranchOptions(): Observable<BranchOption[]> {
    return this.http
      .get<ApiResponse<BranchOption[]>>(this.applicationConfigService.getEndpointFor('api/v1/branches/mine'))
      .pipe(
        map(res => (res.data ?? []).map(b => ({ id: b.id, name: b.name }))),
        catchError(() => throwError(() => new Error('Không thể tải danh sách chi nhánh.'))),
      );
  }

  private toExpense(b: BackendExpense): ExpenseRecord {
    return {
      id: b.id,
      branchId: b.branchId,
      branchName: b.branchName,
      expenseDate: b.expenseDate,
      expenseCategory: b.expenseCategory,
      amount: b.amount ?? 0,
      description: b.description,
      status: b.status as ExpenseRecord['status'],
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  private errorMessage(err: unknown): string {
    const e = err as { status?: number; error?: { message?: string }; message?: string };
    if (e?.error?.message) return e.error.message;
    if (e?.message) return e.message;
    return 'Không thể kết nối tới máy chủ.';
  }
}