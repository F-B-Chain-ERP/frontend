import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ApiResponse } from '../../login/login.model';
import { Material, MaterialFilter, MaterialListResponse } from './material.model';

interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: Material[];
}

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
    if (filter.isPerishable !== null && filter.isPerishable !== undefined) {
      params = params.set('isPerishable', String(filter.isPerishable));
    }

    return this.http.get<ApiResponse<BackendPageResponse>>(this.materialApi, { params }).pipe(
      map(res => {
        const page = res.data;
        const items = (page?.content ?? []).map(m => this.mapResponse(m));
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

  getMaterialById(id: string): Observable<Material | null> {
    return this.http.get<ApiResponse<Material>>(`${this.materialApi}/${id}`).pipe(
      map(res => (res.data ? this.mapResponse(res.data) : null)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  createMaterial(payload: Partial<Material>): Observable<Material> {
    const body = {
      code: payload.code,
      name: payload.name,
      categoryId: payload.categoryId,
      baseUnitId: payload.baseUnitId,
      minStockAlert: payload.minStockAlert,
      shelfLifeDays: payload.shelfLifeDays,
      isPerishable: payload.isPerishable,
    };
    return this.http.post<ApiResponse<Material>>(this.materialApi, body).pipe(
      map(res => this.mapResponse(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  updateMaterial(id: string, payload: Partial<Material>): Observable<Material> {
    const body = {
      code: payload.code,
      name: payload.name,
      categoryId: payload.categoryId,
      baseUnitId: payload.baseUnitId,
      minStockAlert: payload.minStockAlert,
      shelfLifeDays: payload.shelfLifeDays,
      isPerishable: payload.isPerishable,
    };
    return this.http.put<ApiResponse<Material>>(`${this.materialApi}/${id}`, body).pipe(
      map(res => this.mapResponse(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  updateMaterialStatus(id: string, status: string): Observable<Material> {
    return this.http.patch<ApiResponse<Material>>(`${this.materialApi}/${id}/status`, { status }).pipe(
      map(res => this.mapResponse(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  deleteMaterial(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.materialApi}/${id}`).pipe(
      map(() => true),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  private mapResponse(m: Material): Material {
    return {
      ...m,
      categoryName: m.categoryName || '—',
      baseUnitName: m.unitName || m.baseUnitName || '—',
    };
  }

  private errorMessage(err: unknown): string {
    const e = err as {
      status?: number;
      error?: { message?: string; errorCode?: string; data?: unknown };
      message?: string;
    };
    const body = e?.error;
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
