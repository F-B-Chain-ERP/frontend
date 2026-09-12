import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  AddProductToppingRequest,
  ProductItem,
  ProductListResponse,
  ProductTopping,
  ToppingItem,
  UpdateProductToppingRequest,
} from './topping-assignment.model';

interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: ProductItem[];
}

interface ToppingPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: ToppingItem[];
}

/**
 * Service kết nối API gán topping cho sản phẩm (ProductToppingController):
 * - GET    /api/v1/menu/products                              → Danh sách sản phẩm
 * - GET    /api/v1/menu/products/{productId}/toppings          → Danh sách topping đã gán
 * - POST   /api/v1/menu/products/{productId}/toppings          → Gán topping
 * - PUT    /api/v1/menu/product-toppings/{id}                  → Cập nhật config
 * - DELETE /api/v1/menu/product-toppings/{id}                  → Gỡ topping
 * - GET    /api/v1/menu/toppings                               → Danh sách topping (chọn)
 */
@Injectable({
  providedIn: 'root',
})
export class ProductToppingService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get productsUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/menu/products');
  }

  private get toppingsUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/menu/toppings');
  }

  // ── Products ─────────────────────────────────────────────────

  getProducts(search?: string, page = 0, size = 20): Observable<ProductListResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<BackendPageResponse>>(this.productsUrl, { params }).pipe(
      map(res => {
        const pageData = res.data;
        return {
          items: pageData?.content ?? [],
          total: pageData?.totalElements ?? 0,
        };
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  // ── Product-Topping CRUD ─────────────────────────────────────

  listByProduct(productId: string): Observable<ProductTopping[]> {
    return this.http.get<ApiResponse<ProductTopping[]>>(`${this.productsUrl}/${productId}/toppings`).pipe(
      map(res => res.data ?? []),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  add(productId: string, request: AddProductToppingRequest): Observable<ProductTopping> {
    return this.http.post<ApiResponse<ProductTopping>>(`${this.productsUrl}/${productId}/toppings`, request).pipe(
      map(res => res.data as ProductTopping),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  update(id: string, request: UpdateProductToppingRequest): Observable<ProductTopping> {
    return this.http.put<ApiResponse<ProductTopping>>(`${this.applicationConfigService.getEndpointFor('api/v1/menu/product-toppings')}/${id}`, request).pipe(
      map(res => res.data as ProductTopping),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  delete(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<unknown>>(`${this.applicationConfigService.getEndpointFor('api/v1/menu/product-toppings')}/${id}`).pipe(
      map(() => true),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  // ── Toppings (selector) ──────────────────────────────────────

  getToppings(search?: string, page = 0, size = 100): Observable<ToppingItem[]> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('status', 'ACTIVE');
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<ToppingPageResponse>>(this.toppingsUrl, { params }).pipe(
      map(res => res.data?.content ?? []),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  // ── Error handler ────────────────────────────────────────────

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
