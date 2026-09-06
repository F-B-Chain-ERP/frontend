import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, throwError } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ApiResponse } from '../../login/login.model';
import {
  Material,
  MaterialFilter,
  MaterialListResponse,
} from './material.model';

interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: Material[];
}

/**
 * API thật 100% (MaterialController, base /api/v1/inv/materials):
 * - GET    /api/v1/inv/materials?search&categoryId&status
 * - GET    /api/v1/inv/materials/{id}
 * - POST   /api/v1/inv/materials
 * - PUT    /api/v1/inv/materials/{id}
 * - DELETE /api/v1/inv/materials/{id} (xóa nhiều = gọi lặp từng id)
 *
 * Không còn mock/fallback in-memory: BE lỗi -> báo lỗi thật cho user.
 */
@Injectable({
  providedIn: 'root',
})
export class WarehouseMaterialService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get materialApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/materials');
  }

  getMaterials(filter: MaterialFilter): Observable<MaterialListResponse> {
    let params = new HttpParams().set('page', String((filter.pageIndex || 1) - 1)).set('size', String(filter.pageSize || 10));

    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.categoryId) {
      params = params.set('categoryId', filter.categoryId);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    // NOTE: BE MaterialRepository.search chưa hỗ trợ lọc isPerishable,
    // nên filter đó tạm chỉ có tác dụng ở ColumnTextFilter phía client.

    return this.http.get<ApiResponse<BackendPageResponse>>(this.materialApi, { params }).pipe(
      map(res => {
        const page = res.data;
        const items = (page?.content ?? []).map(m => this.enrichMaterialNames(m));
        return {
          items,
          total: page?.totalElements ?? items.length,
          pageIndex: filter.pageIndex,
          pageSize: filter.pageSize,
        };
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  getMaterialById(id: string): Observable<Material> {
    return this.http.get<ApiResponse<Material>>(`${this.materialApi}/${id}`).pipe(
      map(res => this.enrichMaterialNames(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  createMaterial(payload: Partial<Material>): Observable<Material> {
    return this.http.post<ApiResponse<Material>>(this.materialApi, payload).pipe(
      map(res => this.enrichMaterialNames(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  updateMaterial(id: string, payload: Partial<Material>): Observable<Material> {
    return this.http.put<ApiResponse<Material>>(`${this.materialApi}/${id}`, payload).pipe(
      map(res => this.enrichMaterialNames(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  deleteMaterial(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.materialApi}/${id}`).pipe(
      map(() => true),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /** BE chưa có endpoint xóa hàng loạt -> gọi lặp DELETE từng id. */
  batchDeleteMaterials(ids: string[]): Observable<boolean> {
    return forkJoin(ids.map(id => this.http.delete<ApiResponse<void>>(`${this.materialApi}/${id}`))).pipe(
      map(() => true),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  private enrichMaterialNames(m: Material): Material {
    // Chỉ dùng tên THẬT do BE trả về (nested object / categoryName / unitName).
    // Tuyệt đối không bịa tên từ id và không default '—' ở đây:
    // component.withDisplayNames sẽ resolve từ master đã nạp, default '—'
    // ở service sẽ chặn lookup (string truthy) khiến tên thật không bao giờ hiện.
    const catName = m.category?.name || m.categoryName;
    const unitName = m.baseUnit?.name || m.baseUnitName || m.unitName;

    const category = m.category || {
      id: m.categoryId || '',
      name: catName || '',
    };

    const baseUnit = m.baseUnit || {
      id: m.baseUnitId || '',
      code: '',
      name: unitName || '',
    };

    return {
      ...m,
      categoryName: catName,
      baseUnitName: unitName,
      category,
      baseUnit,
    };
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
