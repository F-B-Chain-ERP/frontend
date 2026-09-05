import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { Warehouse, WarehouseFilter, WarehouseListResponse } from './warehouse.model';

interface ApiEnvelope<T> {
  status: number;
  errorCode: string | null;
  message: string;
  data: T;
  timestamp: string;
}

interface PageEnvelope<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

@Injectable({
  providedIn: 'root',
})
export class WarehouseService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get warehouseApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/warehouses');
  }

  /**
   * Lấy danh sách kho phân trang kèm tìm kiếm và lọc.
   */
  getWarehouses(filter: WarehouseFilter): Observable<WarehouseListResponse> {
    let params = new HttpParams()
      .set('page', String((filter.pageIndex || 1) - 1))
      .set('size', String(filter.pageSize || 10));

    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.branchId) {
      params = params.set('branchId', filter.branchId);
    }
    if (filter.warehouseType) {
      params = params.set('warehouseType', filter.warehouseType);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }

    return this.http.get<ApiEnvelope<PageEnvelope<Warehouse>>>(this.warehouseApi, { params }).pipe(
      map(res => {
        const page = res.data;
        const items = page?.content ?? [];
        return {
          items,
          total: page?.totalElements ?? items.length,
          pageIndex: filter.pageIndex,
          pageSize: filter.pageSize,
        };
      }),
    );
  }

  /**
   * Lấy toàn bộ danh sách kho (không phân trang), dùng cho dropdown (ví dụ: màn PO).
   */
  getAllWarehouses(status?: string): Observable<Warehouse[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http
      .get<ApiEnvelope<Warehouse[]>>(`${this.warehouseApi}/all`, { params })
      .pipe(map(res => res.data ?? []));
  }

  /**
   * Lấy chi tiết kho theo ID.
   */
  getWarehouseById(id: string): Observable<Warehouse> {
    return this.http
      .get<ApiEnvelope<Warehouse>>(`${this.warehouseApi}/${id}`)
      .pipe(map(res => res.data));
  }

  /**
   * Tạo mới kho.
   */
  createWarehouse(payload: Partial<Warehouse>): Observable<Warehouse> {
    return this.http
      .post<ApiEnvelope<Warehouse>>(this.warehouseApi, payload)
      .pipe(map(res => res.data));
  }

  /**
   * Cập nhật thông tin kho.
   */
  updateWarehouse(id: string, payload: Partial<Warehouse>): Observable<Warehouse> {
    return this.http
      .put<ApiEnvelope<Warehouse>>(`${this.warehouseApi}/${id}`, payload)
      .pipe(map(res => res.data));
  }

  /**
   * Cập nhật nhanh trạng thái kho (ACTIVE / INACTIVE).
   */
  updateStatus(id: string, status: string): Observable<Warehouse> {
    return this.http
      .patch<ApiEnvelope<Warehouse>>(`${this.warehouseApi}/${id}/status`, { status })
      .pipe(map(res => res.data));
  }

  /**
   * Xóa kho theo ID.
   */
  deleteWarehouse(id: string): Observable<boolean> {
    return this.http
      .delete<ApiEnvelope<void>>(`${this.warehouseApi}/${id}`)
      .pipe(map(() => true));
  }

  /**
   * Xóa hàng loạt kho theo danh sách ID.
   */
  batchDeleteWarehouses(ids: string[]): Observable<boolean> {
    if (ids.length === 0) return of(true);
    const requests = ids.map(id => this.deleteWarehouse(id));
    return forkJoin(requests).pipe(map(() => true));
  }
}
