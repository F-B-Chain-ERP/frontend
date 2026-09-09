import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../../login/login.model';
import { ApplicationConfigService } from '../../../../core/config/application-config.service';
import {
  CreateProductVariantRequest,
  ProductVariant,
  SyncProductVariantItem,
  UpdateProductVariantRequest,
} from './variant.model';

/**
 * Service quản lý các API liên quan đến biến thể sản phẩm (Product Variants):
 * - GET    /api/v1/menu/products/{productId}/variants
 * - POST   /api/v1/menu/products/{productId}/variants
 * - PUT    /api/v1/menu/products/{productId}/variants/{id}
 * - DELETE /api/v1/menu/products/{productId}/variants/{id}
 * - PUT    /api/v1/menu/products/{productId}/variants/sync
 */
@Injectable({
  providedIn: 'root',
})
export class ProductVariantService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private getProductVariantsUrl(productId: string): string {
    return this.applicationConfigService.getEndpointFor(`api/v1/menu/products/${productId}/variants`);
  }

  /** Lấy danh sách toàn bộ biến thể của một sản phẩm */
  getVariants(productId: string): Observable<ProductVariant[]> {
    return this.http
      .get<ApiResponse<ProductVariant[]>>(this.getProductVariantsUrl(productId))
      .pipe(
        map(res => res.data ?? []),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  /** Tạo một biến thể mới cho sản phẩm */
  createVariant(productId: string, data: CreateProductVariantRequest): Observable<ProductVariant> {
    return this.http
      .post<ApiResponse<ProductVariant>>(this.getProductVariantsUrl(productId), data)
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  /** Cập nhật thông tin một biến thể */
  updateVariant(productId: string, variantId: string, data: UpdateProductVariantRequest): Observable<ProductVariant> {
    return this.http
      .put<ApiResponse<ProductVariant>>(`${this.getProductVariantsUrl(productId)}/${variantId}`, data)
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  /** Xóa một biến thể khỏi sản phẩm */
  deleteVariant(productId: string, variantId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.getProductVariantsUrl(productId)}/${variantId}`)
      .pipe(
        map(() => void 0),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  /** Đồng bộ toàn bộ danh sách biến thể của sản phẩm (hỗ trợ tạo mới, cập nhật, xóa theo danh sách) */
  syncVariants(productId: string, variants: SyncProductVariantItem[]): Observable<ProductVariant[]> {
    return this.http
      .put<ApiResponse<ProductVariant[]>>(`${this.getProductVariantsUrl(productId)}/sync`, { variants })
      .pipe(
        map(res => res.data ?? []),
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
