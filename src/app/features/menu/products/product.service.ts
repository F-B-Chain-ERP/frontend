import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ProductVariantService } from './variants/variant.service';
import {
  CreateProductFormData,
  CreateProductRequestDto,
  CreateProductResponse,
  CreateProductVariantRequest,
  Product,
  ProductDetail,
  ProductFilter,
  ProductListResponse,
  ProductVariant,
  SyncProductVariantItem,
  UpdateProductRequestDto,
  UpdateProductVariantRequest,
} from './product.model';

interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: Product[];
}

/**
 * Service kết nối API quản lý sản phẩm thực đơn (Admin ERP):
 * - GET /api/v1/menu/products (hỗ trợ tìm kiếm, phân trang, lọc theo danh mục, trạng thái, nổi bật, bán chạy)
 * - GET /api/v1/menu/products/{id} (lấy chi tiết sản phẩm)
 * - POST /api/v1/menu/products (tạo sản phẩm mới)
 * - PUT /api/v1/menu/products/{id} (cập nhật sản phẩm)
 * - DELETE /api/v1/menu/products/{id} (xóa mềm sản phẩm)
 */
@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly variantService = inject(ProductVariantService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/menu/products');
  }

  getProducts(filter: ProductFilter): Observable<ProductListResponse> {
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
    if (filter.isFeatured !== undefined && filter.isFeatured !== null) {
      params = params.set('isFeatured', String(filter.isFeatured));
    }
    if (filter.isBestSeller !== undefined && filter.isBestSeller !== null) {
      params = params.set('isBestSeller', String(filter.isBestSeller));
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

  /** Lấy thông tin chi tiết một sản phẩm theo ID */
  getProduct(id: string): Observable<ProductDetail> {
    return this.http.get<ApiResponse<ProductDetail>>(`${this.baseUrl}/${id}`).pipe(
      map(res => res.data),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  create(formData: CreateProductFormData): Observable<CreateProductResponse> {
    const fd = new FormData();
    fd.append('categoryId', formData.categoryId);
    fd.append('code', formData.code);
    fd.append('name', formData.name);
    if (formData.description) fd.append('description', formData.description);
    if (formData.imageUrl) fd.append('imageUrl', formData.imageUrl);
    fd.append('basePrice', String(formData.basePrice));
    fd.append('isFeatured', String(!!formData.isFeatured));
    fd.append('isBestSeller', String(!!formData.isBestSeller));
    fd.append('isCombo', String(!!formData.isCombo));
    if (formData.image) fd.append('image', formData.image, formData.image.name);

    return this.http
      .post<ApiResponse<CreateProductResponse>>(this.baseUrl, fd)
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  /** Tạo sản phẩm bằng JSON payload thuần */
  createJson(data: CreateProductRequestDto): Observable<CreateProductResponse> {
    return this.http
      .post<ApiResponse<CreateProductResponse>>(this.baseUrl, data)
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  /** Cập nhật sản phẩm bằng form data (hỗ trợ cả file ảnh hoặc URL) */
  update(id: string, formData: CreateProductFormData): Observable<Product> {
    const fd = new FormData();
    fd.append('categoryId', formData.categoryId);
    fd.append('code', formData.code);
    fd.append('name', formData.name);
    if (formData.description) fd.append('description', formData.description);
    if (formData.imageUrl) fd.append('imageUrl', formData.imageUrl);
    fd.append('basePrice', String(formData.basePrice));
    if (formData.preparationMinutes !== undefined && formData.preparationMinutes !== null) {
      fd.append('preparationMinutes', String(formData.preparationMinutes));
    }
    fd.append('isFeatured', String(!!formData.isFeatured));
    fd.append('isBestSeller', String(!!formData.isBestSeller));
    fd.append('isCombo', String(!!formData.isCombo));
    if (formData.availableIceLevels) fd.append('availableIceLevels', formData.availableIceLevels);
    if (formData.availableSugarLevels) fd.append('availableSugarLevels', formData.availableSugarLevels);
    if (formData.status) fd.append('status', formData.status);
    if (formData.image) fd.append('image', formData.image, formData.image.name);

    return this.http
      .put<ApiResponse<Product>>(`${this.baseUrl}/${id}`, fd)
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  /** Cập nhật sản phẩm bằng JSON payload thuần */
  updateJson(id: string, data: UpdateProductRequestDto): Observable<Product> {
    return this.http
      .put<ApiResponse<Product>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  /** Xóa mềm sản phẩm (chuyển sang DELETED) */
  delete(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(() => void 0),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  /** Upload riêng file ảnh lên MinIO thông qua backend storage endpoint */
  uploadImage(file: File): Observable<string> {
    const fd = new FormData();
    fd.append('image', file, file.name);
    return this.http
      .post<ApiResponse<{ imageUrl: string }>>(`${this.baseUrl}/upload-image`, fd)
      .pipe(
        map(res => res.data.imageUrl),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  // ── Product Variants API (Ủy quyền sang ProductVariantService) ─────

  /** Lấy danh sách toàn bộ biến thể của sản phẩm */
  getVariants(productId: string): Observable<ProductVariant[]> {
    return this.variantService.getVariants(productId);
  }

  /** Tạo một biến thể mới cho sản phẩm */
  createVariant(productId: string, data: CreateProductVariantRequest): Observable<ProductVariant> {
    return this.variantService.createVariant(productId, data);
  }

  /** Cập nhật một biến thể của sản phẩm */
  updateVariant(productId: string, variantId: string, data: UpdateProductVariantRequest): Observable<ProductVariant> {
    return this.variantService.updateVariant(productId, variantId, data);
  }

  /** Xóa một biến thể khỏi sản phẩm */
  deleteVariant(productId: string, variantId: string): Observable<void> {
    return this.variantService.deleteVariant(productId, variantId);
  }

  /** Đồng bộ toàn bộ danh sách biến thể của sản phẩm */
  syncVariants(productId: string, variants: SyncProductVariantItem[]): Observable<ProductVariant[]> {
    return this.variantService.syncVariants(productId, variants);
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
