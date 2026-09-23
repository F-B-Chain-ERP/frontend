import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ApiResponse } from '../../login/login.model';
import { PaymentFilter, PaymentItem, PaymentListResponse } from './payment.model';

interface BackendPage<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

interface PaymentSummaryBE {
  id: string;
  orderCode: string;
  branchId: string;
  orderType: string;
  receiverName: string;
  totalAmount: number;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
  createdAt: string | null;
}

/**
 * API riêng cho màn Thanh toán.
 * Dùng chung dữ liệu orders (nguồn sự thật duy nhất), không đụng pos-staff-api.service.
 * Tương lai MoMo/VNPay sẽ thêm intent/webhook tại đây mà không ảnh hưởng màn Đơn hàng.
 */
@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApplicationConfigService);

  listPayments(filter: PaymentFilter): Observable<PaymentListResponse> {
    let params = new HttpParams().set('page', String(Math.max(filter.pageIndex - 1, 0))).set('size', String(filter.pageSize));
    if (filter.branchId) params = params.set('branchId', filter.branchId);
    if (filter.paymentStatus) params = params.set('paymentStatus', filter.paymentStatus);
    if (filter.paymentMethod) params = params.set('paymentMethod', filter.paymentMethod);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    if (filter.search) params = params.set('search', filter.search);
    return this.http.get<ApiResponse<BackendPage<PaymentSummaryBE>>>(this.ordersUrl(), { params }).pipe(
      map(res => ({
        items: (res.data?.content ?? []).map(o => ({
          id: o.id,
          orderCode: o.orderCode,
          branchId: o.branchId,
          orderType: o.orderType,
          receiverName: o.receiverName,
          totalAmount: o.totalAmount,
          status: o.status,
          paymentMethod: o.paymentMethod ?? null,
          paymentStatus: o.paymentStatus ?? 'UNPAID',
          createdAt: o.createdAt,
        })),
        total: res.data?.totalElements ?? 0,
        pageIndex: (res.data?.pageNumber ?? 0) + 1,
        pageSize: res.data?.pageSize ?? filter.pageSize,
      })),
    );
  }

  confirmPaid(id: string): Observable<unknown> {
    return this.http.post(this.ordersUrl(`/${id}/payment`), { status: 'PAID' });
  }

  private ordersUrl(path = ''): string {
    return this.config.getEndpointFor(`api/v1/pos/orders${path}`);
  }
}
