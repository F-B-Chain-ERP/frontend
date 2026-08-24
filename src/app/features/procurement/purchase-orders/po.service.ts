import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ApiResponse } from '../../login/login.model';
import {
  CreatePurchaseOrderPayload,
  PageResponse,
  PurchaseOrder,
  PurchaseOrderFilter,
  PurchaseOrderStatus,
  UpdatePurchaseOrderPayload,
} from './po.model';

/**
 * Service gọi API thật của backend: /api/v1/proc/purchase-orders
 * Mọi response đều bọc trong ApiResponse<T> → unwrap lấy .data
 */
@Injectable({
  providedIn: 'root',
})
export class PurchaseOrderService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private readonly apiBase = 'api/v1/proc/purchase-orders';

  /** Danh sách đơn mua hàng phân trang (BE: page đếm từ 0). */
  getPurchaseOrders(filter: PurchaseOrderFilter): Observable<PageResponse<PurchaseOrder>> {
    let params = new HttpParams().set('page', String(Math.max(0, (filter.pageIndex || 1) - 1))).set('size', String(filter.pageSize || 10));

    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }

    return this.http
      .get<ApiResponse<PageResponse<PurchaseOrder>>>(this.applicationConfigService.getEndpointFor(this.apiBase), { params })
      .pipe(map(res => res.data));
  }

  /** Chi tiết một đơn mua hàng (kèm dòng chi tiết). */
  getPurchaseOrderById(id: string): Observable<PurchaseOrder> {
    return this.http
      .get<ApiResponse<PurchaseOrder>>(this.applicationConfigService.getEndpointFor(`${this.apiBase}/${id}`))
      .pipe(map(res => res.data));
  }

  /** Tạo mới đơn (BE tự đặt trạng thái DRAFT). */
  createPurchaseOrder(payload: CreatePurchaseOrderPayload): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(this.applicationConfigService.getEndpointFor(this.apiBase), payload)
      .pipe(map(res => res.data));
  }

  /** Cập nhật đơn (chỉ khi DRAFT). Nếu items khác null, thay thế toàn bộ dòng chi tiết. */
  updatePurchaseOrder(id: string, payload: UpdatePurchaseOrderPayload): Observable<PurchaseOrder> {
    return this.http
      .put<ApiResponse<PurchaseOrder>>(this.applicationConfigService.getEndpointFor(`${this.apiBase}/${id}`), payload)
      .pipe(map(res => res.data));
  }

  /** Xóa đơn (chỉ khi DRAFT). */
  deletePurchaseOrder(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(this.applicationConfigService.getEndpointFor(`${this.apiBase}/${id}`))
      .pipe(map(() => undefined));
  }

  /** Gửi duyệt: DRAFT → SUBMITTED. */
  submit(id: string): Observable<PurchaseOrder> {
    return this.actionStatus(id, 'submit');
  }

  /** Phê duyệt: SUBMITTED → APPROVED. */
  approve(id: string): Observable<PurchaseOrder> {
    return this.actionStatus(id, 'approve');
  }

  /** Hủy đơn (kèm lý do tùy chọn). */
  cancel(id: string, reason?: string): Observable<PurchaseOrder> {
    let params = new HttpParams();
    if (reason?.trim()) {
      params = params.set('reason', reason.trim());
    }
    return this.http
      .post<ApiResponse<PurchaseOrder>>(this.applicationConfigService.getEndpointFor(`${this.apiBase}/${id}/cancel`), null, { params })
      .pipe(map(res => res.data));
  }

  private actionStatus(id: string, action: 'submit' | 'approve'): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(this.applicationConfigService.getEndpointFor(`${this.apiBase}/${id}/${action}`), null)
      .pipe(map(res => res.data));
  }
}
