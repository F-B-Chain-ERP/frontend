import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {ApplicationConfigService} from '../../../core/config/application-config.service';
import {normalizeImageUrl} from '../../../core/util/image.util';
import {ApiResponse} from '../../login/login.model';
import {Category} from '../../menu/categories/category.model';
import {Product, ProductDetail} from '../../menu/products/product.model';

export interface SalesCategoryResponse {
  items: Category[];
  total: number;
}

export interface SalesProductListResponse {
  items: Product[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface SalesProductFilter {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string | null;
  isFeatured?: boolean | null;
  isBestSeller?: boolean | null;
  sortBy?: string;
}

interface BackendPageResponse<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

/**
 * Service kết nối các API công khai của kênh bán hàng (Storefront / POS / Khách hàng đặt món):
 * - GET /api/v1/sales/categories (Lấy danh mục đang bán)
 * - GET /api/v1/sales/products (Lấy danh sách sản phẩm với bộ lọc & sắp xếp)
 * - GET /api/v1/sales/products/{id} (Lấy chi tiết sản phẩm kèm danh sách kích cỡ/variants thực tế)
 */
@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApplicationConfigService);

  private get salesUrl(): string {
    return this.config.getEndpointFor('api/v1/sales');
  }

  /**
   * Lấy danh mục sản phẩm đang mở bán cho kênh bán hàng
   */
  getCategories(): Observable<SalesCategoryResponse> {
    const url = `${this.salesUrl}/categories`;
    const params = new HttpParams().set('page', '0').set('size', '100');

    return this.http.get<ApiResponse<BackendPageResponse<Category>>>(url, {params}).pipe(
      map(res => ({
        items: (res.data?.content || []).map(c => ({
          ...c,
          imageUrl: c.imageUrl ? normalizeImageUrl(c.imageUrl) : null,
        })),
        total: res.data?.totalElements || 0,
      })),
      catchError(err => {
        // Fallback sang endpoint menu categories nếu API sales chưa sẵn sàng
        const fallbackUrl = this.config.getEndpointFor('api/v1/menu/categories');
        const fallbackParams = new HttpParams()
          .set('page', '0')
          .set('size', '100')
          .set('categoryType', 'PRODUCT')
          .set('status', 'ACTIVE');
        return this.http.get<ApiResponse<BackendPageResponse<Category>>>(fallbackUrl, {params: fallbackParams}).pipe(
          map(fallbackRes => ({
            items: (fallbackRes.data?.content || []).map(c => ({
              ...c,
              imageUrl: c.imageUrl ? normalizeImageUrl(c.imageUrl) : null,
            })),
            total: fallbackRes.data?.totalElements || 0,
          })),
          catchError(() => throwError(() => err))
        );
      })
    );
  }

  /**
   * Lấy danh sách sản phẩm đang bán có hỗ trợ tìm kiếm, lọc danh mục, nổi bật, bán chạy, sắp xếp
   */
  getProducts(filter?: SalesProductFilter): Observable<SalesProductListResponse> {
    const url = `${this.salesUrl}/products`;
    let params = new HttpParams()
      .set('page', String(Math.max((filter?.pageIndex ?? 1) - 1, 0)))
      .set('size', String(filter?.pageSize ?? 100));

    if (filter?.search?.trim()) {
      params = params.set('search', filter.search.trim());
    }
    if (filter?.categoryId && filter.categoryId !== 'all') {
      params = params.set('categoryId', filter.categoryId);
    }
    if (filter?.isFeatured !== undefined && filter.isFeatured !== null) {
      params = params.set('isFeatured', String(filter.isFeatured));
    }
    if (filter?.isBestSeller !== undefined && filter.isBestSeller !== null) {
      params = params.set('isBestSeller', String(filter.isBestSeller));
    }
    if (filter?.sortBy) {
      params = params.set('sortBy', filter.sortBy);
    }

    return this.http.get<ApiResponse<BackendPageResponse<Product>>>(url, {params}).pipe(
      map(res => ({
        items: (res.data?.content || []).map(p => ({
          ...p,
          imageUrl: p.imageUrl ? normalizeImageUrl(p.imageUrl) : null,
        })),
        total: res.data?.totalElements || 0,
        pageIndex: (res.data?.pageNumber ?? 0) + 1,
        pageSize: res.data?.pageSize ?? 100,
      })),
      catchError(err => {
        // Fallback sang menu products endpoint nếu có trục trặc mạng
        const fallbackUrl = this.config.getEndpointFor('api/v1/menu/products');
        let fbParams = new HttpParams()
          .set('page', String(Math.max((filter?.pageIndex ?? 1) - 1, 0)))
          .set('size', String(filter?.pageSize ?? 100))
          .set('status', 'ACTIVE');
        if (filter?.search?.trim()) fbParams = fbParams.set('search', filter.search.trim());
        if (filter?.categoryId && filter.categoryId !== 'all') fbParams = fbParams.set('categoryId', filter.categoryId);
        return this.http.get<ApiResponse<BackendPageResponse<Product>>>(fallbackUrl, {params: fbParams}).pipe(
          map(fbRes => ({
            items: (fbRes.data?.content || []).map(p => ({
              ...p,
              imageUrl: p.imageUrl ? normalizeImageUrl(p.imageUrl) : null,
            })),
            total: fbRes.data?.totalElements || 0,
            pageIndex: (fbRes.data?.pageNumber ?? 0) + 1,
            pageSize: fbRes.data?.pageSize ?? 100,
          })),
          catchError(() => throwError(() => err))
        );
      })
    );
  }

  /**
   * Lấy chi tiết một sản phẩm đang bán kèm đầy đủ danh sách kích cỡ / variants thực tế
   */
  getProductDetail(id: string): Observable<ProductDetail> {
    const url = `${this.salesUrl}/products/${id}`;
    return this.http.get<ApiResponse<ProductDetail>>(url).pipe(
      map(res => {
        if (!res.data) throw new Error('Không tìm thấy thông tin sản phẩm');
        const detail = res.data;
        if (detail.imageUrl) {
          detail.imageUrl = normalizeImageUrl(detail.imageUrl);
        }
        return detail;
      }),
      catchError(err => {
        // Fallback sang menu getProduct nếu cần
        const fallbackUrl = this.config.getEndpointFor(`api/v1/menu/products/${id}`);
        return this.http.get<ApiResponse<ProductDetail>>(fallbackUrl).pipe(
          map(fbRes => {
            if (!fbRes.data) throw new Error('Không tìm thấy thông tin sản phẩm');
            const detail = fbRes.data;
            if (detail.imageUrl) {
              detail.imageUrl = normalizeImageUrl(detail.imageUrl);
            }
            return detail;
          }),
          catchError(() => throwError(() => err))
        );
      })
    );
  }
}
