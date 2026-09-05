import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { Material } from './supplier-material.model';

/** Shape of the backend paginated material list. */
interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: Material[];
}

/**
 * Đọc danh sách Material (master) phục vụ dropdown "Nguyên vật liệu" trong màn
 * Bảng giá NCC. Chỉ có chức năng GET, không CRUD Material.
 * Nối đúng endpoint backend: GET /api/v1/inv/materials.
 */
@Injectable({
  providedIn: 'root',
})
export class MaterialService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/materials');
  }

  getMaterials(search?: string): Observable<Material[]> {
    let params = new HttpParams().set('page', '0').set('size', '10');
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<BackendPageResponse>>(this.baseUrl, { params }).pipe(
      map(res => res.data?.content ?? []),
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
    return 'Không thể tải danh sách nguyên vật liệu.';
  }
}
