import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  PurchaseOrder,
  PurchaseOrderDetail,
  PurchaseOrderFilter,
  PurchaseOrderListResponse,
  PurchaseOrderPayload,
} from './po.model';

/** Envelope chung của API backend (đồng nhất với user.service). */
interface ApiEnvelope<T> {
  status: number;
  errorCode: string | null;
  message: string;
  data: T;
  timestamp: string;
}

/** Cấu trúc phân trang của BE. */
interface PageEnvelope<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

/** Response BE của một đơn mua hàng. */
interface PoResponseBE {
  id: string;
  poCode: string;
  status: string;
  orderDate: string | null;
  expectedDate: string | null;
  supplier?: { id: string; code?: string; name: string } | null;
  warehouse?: { id: string; code?: string; name: string } | null;
  subtotalAmount?: number | null;
  totalAmount?: number | null;
  note?: string | null;
  submittedAt?: string | null;
  approvedBy?: { id: string; fullName: string } | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: { id: string; fullName: string } | null;
  rejectReason?: string | null;
  items?: PoItemResponseBE[];
  createdAt?: string | null;
}

interface PoItemResponseBE {
  id?: string;
  materialId?: string;
  materialName?: string;
  unitId?: string;
  unitName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  receivedQuantity?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PurchaseOrderService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get poApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/proc/purchase-orders');
  }

  /**
   * Danh sách đơn mua hàng phân trang (gọi BE, map sang shape hiển thị bảng).
   */
  getPurchaseOrders(filter: PurchaseOrderFilter): Observable<PurchaseOrderListResponse> {
    let params = new HttpParams().set('page', String((filter.pageIndex || 1) - 1)).set('size', String(filter.pageSize || 10));

    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.status !== null && filter.status !== undefined) {
      params = params.set('status', filter.status);
    }
    if (filter.warehouseId) {
      params = params.set('warehouseId', String(filter.warehouseId));
    }
    if (filter.fromDate) {
      params = params.set('fromDate', filter.fromDate);
    }
    if (filter.toDate) {
      params = params.set('toDate', filter.toDate);
    }

    return this.http.get<ApiEnvelope<PageEnvelope<PoResponseBE>>>(this.poApi, { params }).pipe(
      map(res => {
        const page = res.data;
        const items = (page?.content ?? []).map(r => this.toListPo(r));
        return {
          items,
          total: page?.totalElements ?? items.length,
          pageIndex: filter.pageIndex,
          pageSize: filter.pageSize,
        };
      }),
      catchError((err: unknown) => throwError(() => err)),
    );
  }

  getPurchaseOrderById(id: string | number): Observable<PurchaseOrderDetail | null> {
    return this.http.get<ApiEnvelope<PoResponseBE>>(`${this.poApi}/${id}`).pipe(map(res => (res.data ? this.toDetail(res.data) : null)));
  }

  createPurchaseOrder(payload: PurchaseOrderPayload): Observable<PurchaseOrderDetail> {
    return this.http.post<ApiEnvelope<PoResponseBE>>(this.poApi, payload).pipe(map(res => this.toDetail(res.data)));
  }

  updatePurchaseOrder(id: string | number, payload: PurchaseOrderPayload): Observable<PurchaseOrderDetail> {
    return this.http.put<ApiEnvelope<PoResponseBE>>(`${this.poApi}/${id}`, payload).pipe(map(res => this.toDetail(res.data)));
  }

  deletePurchaseOrder(id: string | number): Observable<boolean> {
    return this.http.delete<ApiEnvelope<void>>(`${this.poApi}/${id}`).pipe(map(() => true));
  }

  submit(id: string | number): Observable<PurchaseOrderDetail> {
    return this.http.post<ApiEnvelope<PoResponseBE>>(`${this.poApi}/${id}/submit`, {}).pipe(map(res => this.toDetail(res.data)));
  }

  approve(id: string | number): Observable<PurchaseOrderDetail> {
    return this.http.post<ApiEnvelope<PoResponseBE>>(`${this.poApi}/${id}/approve`, {}).pipe(map(res => this.toDetail(res.data)));
  }

  cancel(id: string | number, reason?: string): Observable<PurchaseOrderDetail> {
    const params = reason ? new HttpParams().set('reason', reason) : undefined;
    return this.http
      .post<ApiEnvelope<PoResponseBE>>(`${this.poApi}/${id}/cancel`, {}, { params })
      .pipe(map(res => this.toDetail(res.data)));
  }

  reject(id: string | number, reason?: string): Observable<PurchaseOrderDetail> {
    const params = reason ? new HttpParams().set('reason', reason) : undefined;
    return this.http
      .post<ApiEnvelope<PoResponseBE>>(`${this.poApi}/${id}/reject`, {}, { params })
      .pipe(map(res => this.toDetail(res.data)));
  }

  receive(id: string | number, items: { purchaseOrderItemId: string; receivedQuantity: number }[]): Observable<PurchaseOrderDetail> {
    return this.http.post<ApiEnvelope<PoResponseBE>>(`${this.poApi}/${id}/receive`, { items }).pipe(map(res => this.toDetail(res.data)));
  }

  private toListPo(r: PoResponseBE): PurchaseOrder {
    return {
      id: r.id,
      code: r.poCode,
      supplierId: r.supplier?.id ?? '',
      supplierName: r.supplier?.name ?? '',
      warehouseId: r.warehouse?.id ?? '',
      warehouseName: r.warehouse?.name ?? '',
      orderDate: r.orderDate ?? '',
      expectedDate: r.expectedDate ?? '',
      status: r.status,
      items: (r.items ?? []).map(i => ({
        id: i.id ?? '',
        materialName: i.materialName ?? '',
        unit: i.unitName ?? '',
        quantity: i.quantity ?? 0,
        unitPrice: i.unitPrice ?? 0,
      })),
      totalAmount: r.totalAmount ?? 0,
      note: r.note ?? '',
      createdAt: r.createdAt ?? '',
      rejectedAt: r.rejectedAt ?? null,
      rejectedBy: r.rejectedBy ?? null,
      rejectReason: r.rejectReason ?? null,
    };
  }

  private toDetail(r: PoResponseBE): PurchaseOrderDetail {
    return {
      id: r.id,
      poCode: r.poCode,
      status: r.status,
      orderDate: r.orderDate ?? '',
      expectedDate: r.expectedDate ?? '',
      supplierId: r.supplier?.id ?? '',
      supplierName: r.supplier?.name ?? '',
      warehouseId: r.warehouse?.id ?? '',
      warehouseName: r.warehouse?.name ?? '',
      subtotalAmount: r.subtotalAmount ?? 0,
      totalAmount: r.totalAmount ?? 0,
      note: r.note ?? '',
      submittedAt: r.submittedAt ?? null,
      approvedBy: r.approvedBy ?? null,
      approvedAt: r.approvedAt ?? null,
      rejectedAt: r.rejectedAt ?? null,
      rejectedBy: r.rejectedBy ?? null,
      rejectReason: r.rejectReason ?? null,
      createdAt: r.createdAt ?? null,
      items: (r.items ?? []).map(i => ({
        id: i.id,
        materialId: i.materialId ?? '',
        materialName: i.materialName,
        unitId: i.unitId ?? '',
        unitName: i.unitName,
        quantity: i.quantity ?? 0,
        unitPrice: i.unitPrice ?? 0,
        totalPrice: i.totalPrice ?? 0,
        receivedQuantity: i.receivedQuantity ?? 0,
      })),
    };
  }
}
