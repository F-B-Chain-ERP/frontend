import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  Category,
  CategoryFilter,
  CategoryListResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from './category.model';

/** Shape of the backend paginated category list. */
interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: Category[];
}

/**
 * Kết nối API thật của backend (CategoryController, base /api/v1/menu/categories):
 * - GET    /api/v1/menu/categories
 * - GET    /api/v1/menu/categories/{id}
 * - POST   /api/v1/menu/categories
 * - PUT    /api/v1/menu/categories/{id}
 * - PATCH  /api/v1/menu/categories/{id}/status
 * - DELETE /api/v1/menu/categories/{id}
 */
@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/menu/categories');
  }

  getCategories(filter: CategoryFilter): Observable<CategoryListResponse> {
    let params = new HttpParams()
      .set('page', String(Math.max((filter.pageIndex ?? 1) - 1, 0)))
      .set('size', String(filter.pageSize ?? 10));
    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.categoryType) {
      params = params.set('categoryType', filter.categoryType);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    return this.http.get<ApiResponse<BackendPageResponse>>(this.baseUrl, { params }).pipe(
      map(res => {
        const page = res.data;
        const content = page?.content ?? [];
        return {
          items: content,
          total: page?.totalElements ?? 0,
          pageIndex: (page?.pageNumber ?? 0) + 1,
          pageSize: page?.pageSize ?? filter.pageSize ?? 10,
        };
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  create(req: CreateCategoryRequest): Observable<Category> {
    return this.http.post<ApiResponse<Category>>(this.baseUrl, req).pipe(
      map(res => res.data as Category),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  update(id: string, req: UpdateCategoryRequest): Observable<Category> {
    return this.http.put<ApiResponse<Category>>(`${this.baseUrl}/${id}`, req).pipe(
      map(res => res.data as Category),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  updateStatus(id: string, status: string): Observable<Category> {
    return this.http.patch<ApiResponse<Category>>(`${this.baseUrl}/${id}/status`, { status }).pipe(
      map(res => res.data as Category),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  delete(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`).pipe(
      map(() => true),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  private errorMessage(err: unknown): string {
    const e = err as {
      status?: number;
      error?: { message?: string; errorCode?: string; data?: unknown };
      message?: string;
    };
    const body = e?.error;
    // BE validation errors: { message: 'Validation error', data: { field: msg } }
    if (body?.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
      const msgs = Object.values(body.data as Record<string, unknown>).filter(
        (v): v is string => typeof v === 'string' && v.trim().length > 0,
      );
      if (msgs.length > 0) {
        return msgs.join('; ');
      }
    }
    if (body?.message && body.message !== 'Validation error') {
      return body.message;
    }
    if (body?.message === 'Validation error') {
      return 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại.';
    }
    if (e?.message) {
      return e.message;
    }
    return 'Không thể kết nối tới máy chủ.';
  }
}
