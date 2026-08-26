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
    const e = err as { status?: number; error?: { message?: string }; message?: string };
    if (e?.error?.message) {
      return e.error.message;
    }
    if (e?.message) {
      return e.message;
    }
    return 'Không thể kết nối tới máy chủ.';
  }
}
