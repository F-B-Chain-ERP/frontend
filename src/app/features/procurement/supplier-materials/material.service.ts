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
    let params = new HttpParams().set('page', '0').set('size', '200');
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<BackendPageResponse>>(this.baseUrl, { params }).pipe(
      map(res => res.data?.content ?? []),
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
    return 'Không thể tải danh sách nguyên vật liệu.';
  }
}
