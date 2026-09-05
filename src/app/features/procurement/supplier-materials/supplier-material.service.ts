import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  SupplierMaterial,
  SupplierMaterialFilter,
  CreateSupplierMaterialRequest,
  UpdateSupplierMaterialRequest,
  SupplierMaterialListResponse,
} from './supplier-material.model';

/** Shape of the backend paginated supplier-material list. */
interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: SupplierMaterial[];
}

/**
 * Kết nối API thật của backend (SupplierMaterialController, base /api/v1/proc):
 * - GET    /suppliers/{supplierId}/materials
 * - POST   /suppliers/{supplierId}/materials
 * - PUT    /supplier-materials/{id}
 * - DELETE /supplier-materials/{id}
 */
@Injectable({
  providedIn: 'root',
})
export class SupplierMaterialService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/proc');
  }

  getBySupplier(supplierId: string, filter: SupplierMaterialFilter): Observable<SupplierMaterialListResponse> {
    let params = new HttpParams()
      .set('page', String(Math.max((filter.pageIndex ?? 1) - 1, 0)))
      .set('size', String(filter.pageSize ?? 10));
    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    return this.http
      .get<ApiResponse<BackendPageResponse>>(`${this.baseUrl}/suppliers/${supplierId}/materials`, { params })
      .pipe(
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

  create(supplierId: string, req: CreateSupplierMaterialRequest): Observable<SupplierMaterial> {
    return this.http
      .post<ApiResponse<SupplierMaterial>>(`${this.baseUrl}/suppliers/${supplierId}/materials`, req)
      .pipe(
        map(res => res.data as SupplierMaterial),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  update(id: string, req: UpdateSupplierMaterialRequest): Observable<SupplierMaterial> {
    return this.http
      .put<ApiResponse<SupplierMaterial>>(`${this.baseUrl}/supplier-materials/${id}`, req)
      .pipe(
        map(res => res.data as SupplierMaterial),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  delete(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/supplier-materials/${id}`).pipe(
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
    // Ưu tiên hiển thị chi tiết từng field thay vì message chung tiếng Anh.
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
