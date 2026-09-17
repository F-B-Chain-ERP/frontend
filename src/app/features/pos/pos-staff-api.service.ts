import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApplicationConfigService } from '../../core/config/application-config.service';
import { ApiResponse } from '../login/login.model';
import { PosDeliveryInfo, PosOrderDetail, PosOrderFilter, PosOrderHistory, PosOrderListResponse } from './order.model';

interface BackendPage<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

/** Đúng key JSON BE OrderSummaryResponse (receiverName, không phải customerName). */
interface OrderSummaryBE {
  id: string;
  orderCode: string;
  branchId: string;
  orderType: string;
  receiverName: string;
  totalAmount: number;
  status: string;
  createdAt: string | null;
}

/**
 * API staff quản đơn/giao hàng (đủ cho 2 màn thay coming-soon):
 * orders: list/get/status/cancel/complete/payment/history,
 * deliveries: get/assign/status.
 */
@Injectable({
  providedIn: 'root',
})
export class PosStaffApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApplicationConfigService);

  listOrders(filter: PosOrderFilter): Observable<PosOrderListResponse> {
    let params = new HttpParams().set('page', String(Math.max(filter.pageIndex - 1, 0))).set('size', String(filter.pageSize));
    if (filter.branchId) params = params.set('branchId', filter.branchId);
    if (filter.orderType) params = params.set('orderType', filter.orderType);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    return this.http.get<ApiResponse<BackendPage<OrderSummaryBE>>>(this.ordersUrl(), { params }).pipe(
      map(res => ({
        items: (res.data?.content ?? []).map(o => ({
          id: o.id,
          orderCode: o.orderCode,
          branchId: o.branchId,
          orderType: o.orderType,
          receiverName: o.receiverName,
          totalAmount: o.totalAmount,
          status: o.status,
          createdAt: o.createdAt,
        })),
        total: res.data?.totalElements ?? 0,
        pageIndex: (res.data?.pageNumber ?? 0) + 1,
        pageSize: res.data?.pageSize ?? filter.pageSize,
      })),
    );
  }

  getOrder(id: string): Observable<PosOrderDetail> {
    return this.http.get<ApiResponse<PosOrderDetail>>(this.ordersUrl(`/${id}`)).pipe(map(res => res.data));
  }

  updateStatus(id: string, status: string, note?: string | null): Observable<unknown> {
    return this.http.post(this.ordersUrl(`/${id}/status`), { status, note: note ?? null });
  }

  cancelOrder(id: string, reason: string, note?: string | null): Observable<unknown> {
    return this.http.post(this.ordersUrl(`/${id}/cancel`), { reason, note: note ?? null });
  }

  completeOrder(id: string, note?: string | null): Observable<unknown> {
    return this.http.post(this.ordersUrl(`/${id}/complete`), { note: note ?? null });
  }

  updatePayment(id: string, status: string, note?: string | null): Observable<unknown> {
    return this.http.post(this.ordersUrl(`/${id}/payment`), { status, note: note ?? null });
  }

  getHistory(id: string): Observable<PosOrderHistory[]> {
    return this.http.get<ApiResponse<PosOrderHistory[]>>(this.ordersUrl(`/${id}/history`)).pipe(map(res => res.data ?? []));
  }

  getDelivery(orderId: string): Observable<PosDeliveryInfo> {
    return this.http.get<ApiResponse<PosDeliveryInfo>>(this.deliveriesUrl(`/${orderId}`)).pipe(map(res => res.data));
  }

  assignDelivery(orderId: string, shipperId: string): Observable<PosDeliveryInfo> {
    return this.http.put<ApiResponse<PosDeliveryInfo>>(this.deliveriesUrl(`/${orderId}/assign`), { shipperId }).pipe(map(res => res.data));
  }

  updateDeliveryStatus(orderId: string, status: string, failReason?: string | null, note?: string | null): Observable<unknown> {
    return this.http.post(this.deliveriesUrl(`/${orderId}/status`), {
      status,
      failReason: failReason ?? null,
      note: note ?? null,
    });
  }

  private ordersUrl(path = ''): string {
    return this.config.getEndpointFor(`api/v1/pos/orders${path}`);
  }

  private deliveriesUrl(path = ''): string {
    return this.config.getEndpointFor(`api/v1/pos/deliveries${path}`);
  }
}
