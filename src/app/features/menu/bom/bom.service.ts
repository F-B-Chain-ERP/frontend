import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  AddBomItemRequest,
  BomResponse,
  BulkSyncBomRequest,
  ProductBomOverview,
  ProductRecipeItemResponse,
  UpdateBomItemRequest,
} from './bom.model';

/**
 * Service kết nối trực tiếp các API BOM (Bill of Materials):
 * 1. GET    /api/v1/menu/variants/{variantId}/bom          - Xem BOM của biến thể
 * 2. POST   /api/v1/menu/variants/{variantId}/bom/items    - Thêm NVL vào BOM
 * 3. PUT    /api/v1/menu/variants/{variantId}/bom/items/{id} - Cập nhật dòng BOM
 * 4. DELETE /api/v1/menu/variants/{variantId}/bom/items/{id} - Gỡ dòng BOM (xóa mềm)
 * 5. PUT    /api/v1/menu/variants/{variantId}/bom          - Cập nhật toàn bộ BOM (Sync)
 * 6. GET    /api/v1/menu/bom/overview                     - Danh sách tổng quan BOM
 */
@Injectable({
  providedIn: 'root',
})
export class BomService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseMenuUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/menu');
  }

  /**
   * Lấy danh sách tổng quan các món và biến thể kèm số lượng NVL trong BOM.
   */
  getBomOverview(search?: string): Observable<ProductBomOverview[]> {
    let params = new HttpParams();
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http
      .get<ApiResponse<ProductBomOverview[]>>(`${this.baseMenuUrl}/bom/overview`, { params })
      .pipe(map((res) => res.data ?? []));
  }

  /**
   * Lấy chi tiết công thức định lượng (BOM) của một biến thể đồ uống.
   */
  getBom(variantId: string): Observable<BomResponse> {
    return this.http
      .get<ApiResponse<BomResponse>>(`${this.baseMenuUrl}/variants/${variantId}/bom`)
      .pipe(map((res) => res.data));
  }

  /**
   * Thêm một dòng nguyên vật liệu vào công thức định lượng của biến thể.
   */
  addItem(variantId: string, request: AddBomItemRequest): Observable<ProductRecipeItemResponse> {
    return this.http
      .post<ApiResponse<ProductRecipeItemResponse>>(
        `${this.baseMenuUrl}/variants/${variantId}/bom/items`,
        request
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Cập nhật một dòng nguyên vật liệu trong công thức định lượng.
   */
  updateItem(
    variantId: string,
    itemId: string,
    request: UpdateBomItemRequest
  ): Observable<ProductRecipeItemResponse> {
    return this.http
      .put<ApiResponse<ProductRecipeItemResponse>>(
        `${this.baseMenuUrl}/variants/${variantId}/bom/items/${itemId}`,
        request
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Gỡ (xóa mềm) một dòng nguyên vật liệu khỏi công thức định lượng.
   */
  removeItem(variantId: string, itemId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseMenuUrl}/variants/${variantId}/bom/items/${itemId}`)
      .pipe(map(() => void 0));
  }

  /**
   * Đồng bộ / Cập nhật toàn bộ công thức định lượng của biến thể.
   */
  syncBom(variantId: string, request: BulkSyncBomRequest): Observable<BomResponse> {
    return this.http
      .put<ApiResponse<BomResponse>>(`${this.baseMenuUrl}/variants/${variantId}/bom`, request)
      .pipe(map((res) => res.data));
  }
}
