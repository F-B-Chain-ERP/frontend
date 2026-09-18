import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApplicationConfigService } from '../../core/config/application-config.service';
import { ApiResponse } from '../login/login.model';
import { KdsTicketDetail, KdsTicketFilter, KdsTicketListResponse } from './kds.model';

interface BackendPage<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

/**
 * API bếp KDS (trạm BAR cố định, queue_no theo ngày theo chi nhánh).
 * Endpoint BE: /api/v1/pos/kds, quyền pos:kds_ticket:view/update.
 */
@Injectable({
  providedIn: 'root',
})
export class KdsApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApplicationConfigService);

  listTickets(filter: KdsTicketFilter): Observable<KdsTicketListResponse> {
    let params = new HttpParams().set('page', String(Math.max(filter.pageIndex - 1, 0))).set('size', String(filter.pageSize));
    if (filter.branchId) params = params.set('branchId', filter.branchId);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    return this.http.get<ApiResponse<BackendPage<KdsTicketDetail>>>(this.url('/tickets'), { params }).pipe(
      map(res => ({
        items: (res.data?.content ?? []).map(t => ({
          id: t.id,
          orderId: t.orderId,
          orderCode: t.orderCode,
          branchId: t.branchId,
          station: t.station,
          queueNo: t.queueNo,
          ticketCode: t.ticketCode,
          status: t.status,
          customerName: t.customerName,
          orderType: t.orderType,
          totalItems: t.totalItems,
          createdAt: t.createdAt,
        })),
        total: res.data?.totalElements ?? 0,
        pageIndex: (res.data?.pageNumber ?? 0) + 1,
        pageSize: res.data?.pageSize ?? filter.pageSize,
      })),
    );
  }

  getTicket(id: string): Observable<KdsTicketDetail> {
    return this.http.get<ApiResponse<KdsTicketDetail>>(this.url(`/tickets/${id}`)).pipe(map(res => res.data));
  }

  start(id: string): Observable<unknown> {
    return this.http.post(this.url(`/tickets/${id}/start`), {});
  }

  ready(id: string): Observable<unknown> {
    return this.http.post(this.url(`/tickets/${id}/ready`), {});
  }

  serve(id: string): Observable<unknown> {
    return this.http.post(this.url(`/tickets/${id}/serve`), {});
  }

  progressItem(itemId: string, preparedQuantity?: number | null, status?: string | null): Observable<unknown> {
    return this.http.post(this.url(`/items/${itemId}/progress`), {
      preparedQuantity: preparedQuantity ?? null,
      status: status ?? null,
    });
  }

  private url(path = ''): string {
    return this.config.getEndpointFor(`api/v1/pos/kds${path}`);
  }
}
