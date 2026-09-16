import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {ApiResponse} from '../../login/login.model';
import {ApplicationConfigService} from '../../../core/config/application-config.service';
import {
  AddComboItemRequestDto,
  CalculateComboPriceRequestDto,
  CalculateComboPriceResponseDto,
  Combo,
  ComboDetail,
  ComboFilter,
  ComboListResponse,
} from './combo.model';

interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: Combo[];
}

@Injectable({
  providedIn: 'root',
})
export class ComboService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/menu/combos');
  }

  /**
   * Lấy danh sách combos (products có isCombo=true) với phân trang.
   */
  listCombos(filter: ComboFilter): Observable<ComboListResponse> {
    let params = new HttpParams()
      .set('page', String(Math.max((filter.pageIndex ?? 1) - 1, 0)))
      .set('size', String(filter.pageSize ?? 10));

    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.categoryId) {
      params = params.set('categoryId', filter.categoryId);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.sortBy?.trim()) {
      params = params.set('sortBy', filter.sortBy.trim());
    }
    if (filter.sortDirection?.trim()) {
      params = params.set('sortDirection', filter.sortDirection.trim());
    }

    return this.http.get<ApiResponse<BackendPageResponse>>(this.baseUrl, {params}).pipe(
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

  /**
   * Lấy chi tiết combo kèm danh sách thành phần ACTIVE.
   */
  getDetail(comboId: string): Observable<ComboDetail> {
    return this.http.get<ApiResponse<ComboDetail>>(`${this.baseUrl}/${comboId}`).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Thêm một thành phần vào Combo (per-item).
   */
  addItem(comboId: string, request: AddComboItemRequestDto): Observable<ComboDetail> {
    return this.http.post<ApiResponse<ComboDetail>>(`${this.baseUrl}/${comboId}/items`, request).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Xóa mềm một thành phần khỏi Combo (per-item).
   */
  removeItem(comboId: string, itemId: string): Observable<ComboDetail> {
    return this.http.delete<ApiResponse<ComboDetail>>(`${this.baseUrl}/${comboId}/items/${itemId}`).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Đồng bộ toàn bộ thành phần Combo (thêm mới, cập nhật, xóa mềm). Atomic transaction.
   */
  syncItems(comboId: string, items: {variantId: string; quantity: number; isSubstitutable: boolean}[]): Observable<ComboDetail> {
    return this.http.put<ApiResponse<ComboDetail>>(`${this.baseUrl}/${comboId}/items`, {items}).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Tính giá combo linh hoạt khi khách hàng đổi biến thể (flex pricing).
   */
  calculatePrice(request: CalculateComboPriceRequestDto): Observable<CalculateComboPriceResponseDto> {
    return this.http.post<ApiResponse<CalculateComboPriceResponseDto>>(`${this.baseUrl}/calculate-price`, request).pipe(
      map(res => res.data),
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
    return 'Không thể kết nối tới máy chủ.';
  }
}
