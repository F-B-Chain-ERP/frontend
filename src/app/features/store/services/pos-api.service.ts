import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ApiResponse } from '../../login/login.model';

import {
  AddPosCartItemRequest,
  CreatePosOrderRequest,
  CustomerProfile,
  PosCart,
  PosOrder,
  PosOrderDetail,
  PosOrderHistoryItem,
  SalesBranch,
  SalesProductTopping,
  UpdatePosCartItemRequest,
  UpdateProfileRequest,
} from '../models/pos.model';

export * from '../models/pos.model';

/**
 * Client gọi API thật của 3 module cart/order (kênh bán hàng):
 * - GET/POST/PUT/DELETE /api/v1/pos/cart
 * - POST /api/v1/pos/orders (kèm header Idempotency-Key chống trùng đơn)
 * - GET /api/v1/sales/branches, /api/v1/sales/products/{id}/toppings
 * JWT khách (CUSTOMER) do auth.interceptor tự gắn.
 */
@Injectable({
  providedIn: 'root',
})
export class PosApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApplicationConfigService);

  getCart(branchId: string): Observable<PosCart> {
    const params = new HttpParams().set('branchId', branchId);
    return this.http.get<ApiResponse<PosCart>>(this.posUrl('/cart'), { params }).pipe(map(res => res.data));
  }

  /** Thêm món -> caller tự refresh() để lấy truth từ server (giá/tồn do BE tính). */
  addItem(request: AddPosCartItemRequest): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(this.posUrl('/cart/items'), request);
  }

  updateItem(itemId: string, request: UpdatePosCartItemRequest): Observable<unknown> {
    return this.http.put<ApiResponse<unknown>>(this.posUrl(`/cart/items/${itemId}`), request);
  }

  deleteItem(itemId: string): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(this.posUrl(`/cart/items/${itemId}`));
  }

  createOrder(request: CreatePosOrderRequest, idempotencyKey: string): Observable<PosOrder> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<ApiResponse<PosOrder>>(this.posUrl('/orders'), request, { headers }).pipe(map(res => res.data));
  }

  /** Đơn của tôi (BE tự lọc theo CUSTOMER login, phân trang 0-based). */
  listMyOrders(page = 1, size = 10, status?: string | null): Observable<{ items: PosOrder[]; total: number }> {
    let params = new HttpParams().set('page', String(Math.max(page - 1, 0))).set('size', String(size));
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse<{ content: PosOrder[]; totalElements: number }>>(this.posUrl('/orders'), { params }).pipe(
      map(res => ({ items: res.data?.content ?? [], total: res.data?.totalElements ?? 0 })),
    );
  }

  getMyOrder(id: string): Observable<PosOrderDetail> {
    return this.http.get<ApiResponse<PosOrderDetail>>(this.posUrl(`/orders/${id}`)).pipe(map(res => res.data));
  }

  getMyOrderHistory(id: string): Observable<PosOrderHistoryItem[]> {
    return this.http.get<ApiResponse<PosOrderHistoryItem[]>>(this.posUrl(`/orders/${id}/history`)).pipe(map(res => res.data ?? []));
  }

  cancelMyOrder(id: string, reason: string): Observable<unknown> {
    return this.http.post(this.posUrl(`/orders/${id}/cancel`), { reason });
  }

  getSalesBranches(): Observable<SalesBranch[]> {
    return this.http.get<ApiResponse<SalesBranch[]>>(this.salesUrl('/branches')).pipe(map(res => res.data ?? []));
  }

  getProductToppings(productId: string, branchId?: string | null): Observable<SalesProductTopping[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId);
    return this.http
      .get<ApiResponse<SalesProductTopping[]>>(this.salesUrl(`/products/${productId}/toppings`), { params })
      .pipe(map(res => res.data ?? []));
  }

  getMyProfile(): Observable<CustomerProfile> {
    return this.http
      .get<ApiResponse<CustomerProfile>>(this.config.getEndpointFor('api/v1/customers/me'))
      .pipe(map(res => res.data));
  }

  updateMyProfile(request: UpdateProfileRequest): Observable<CustomerProfile> {
    return this.http
      .put<ApiResponse<CustomerProfile>>(this.config.getEndpointFor('api/v1/customers/me'), request)
      .pipe(map(res => res.data));
  }

  private posUrl(path: string): string {
    return this.config.getEndpointFor(`api/v1/pos${path}`);
  }

  private salesUrl(path: string): string {
    return this.config.getEndpointFor(`api/v1/sales${path}`);
  }
}
