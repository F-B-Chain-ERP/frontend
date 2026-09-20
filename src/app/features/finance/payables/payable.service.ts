import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, expand, map, reduce } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { AccountsPayableRecord, PayablePayment } from './payable.model';

/** Backend paginated response shape. */
interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: BackendAccountsPayable[];
}

/** Shape of an accounts payable as returned by the backend. */
interface BackendAccountsPayable {
  id: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  purchaseOrderId?: string;
  poCode?: string;
  invoiceNo?: string;
  invoiceAmount: number;
  paidAmount: number;
  remainingAmount: number;
  receivedDate?: string;
  dueDate?: string;
  paymentTermDays?: number;
  invoiceDate?: string;
  status: string;
  note?: string;
  createdAt: string;
}

/** Shape of a payment as returned by the backend. */
interface BackendPayment {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  createdBy?: string;
  createdAt: string;
}

export interface PayableFilter {
  query?: string;
  status?: string | null;
  supplierId?: string | null;
  dueFrom?: string | null;
  dueTo?: string | null;
  sortBy?: string | null;
  sortDir?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface SupplierOption {
  id: string;
  name: string;
}

export interface PayableListResponse {
  items: AccountsPayableRecord[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

/**
 * Kết nối với API thật của backend (AccountsPayableController: /api/v1/fin/payables).
 */
@Injectable({ providedIn: 'root' })
export class PayableService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/fin/payables');
  }

  getPayables(filter: PayableFilter): Observable<PayableListResponse> {
    let params = new HttpParams()
      .set('page', String(Math.max((filter.pageIndex ?? 1) - 1, 0)))
      .set('size', String(filter.pageSize ?? 10));

    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.supplierId) {
      params = params.set('supplierId', filter.supplierId);
    }
    if (filter.dueFrom) {
      params = params.set('dueFrom', filter.dueFrom);
    }
    if (filter.dueTo) {
      params = params.set('dueTo', filter.dueTo);
    }
    if (filter.sortBy) {
      params = params.set('sortBy', filter.sortBy);
    }
    if (filter.sortDir) {
      params = params.set('sortDir', filter.sortDir);
    }

    return this.http.get<ApiResponse<BackendPageResponse>>(this.baseUrl, { params }).pipe(
      map(res => {
        const page = res.data;
        const content = page?.content ?? [];
        const items = content.map(s => this.toPayable(s));
        return {
          items,
          total: page?.totalElements ?? 0,
          pageIndex: (page?.pageNumber ?? 0) + 1,
          pageSize: page?.pageSize ?? filter.pageSize ?? 10,
        };
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  getPayableById(id: string): Observable<AccountsPayableRecord | null> {
    return this.http.get<ApiResponse<BackendAccountsPayable>>(`${this.baseUrl}/${id}`).pipe(
      map(res => (res.data ? this.toPayable(res.data) : null)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  getPayments(payableId: string): Observable<PayablePayment[]> {
    return this.http.get<ApiResponse<BackendPayment[]>>(`${this.baseUrl}/${payableId}/payments`).pipe(
      map(res => (res.data ?? []).map(p => this.toPayment(p))),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  recordPayment(payableId: string, paymentDate: string, amount: number, paymentMethod: string, referenceNo?: string): Observable<PayablePayment> {
    const body = { paymentDate, amount, paymentMethod, referenceNo: referenceNo || null };
    return this.http.post<ApiResponse<BackendPayment>>(`${this.baseUrl}/${payableId}/payments`, body).pipe(
      map(res => this.toPayment(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  createPayable(body: {
    supplierId: string;
    invoiceNo?: string;
    invoiceAmount: number;
    dueDate?: string;
    purchaseOrderId?: string;
    note?: string;
  }): Observable<AccountsPayableRecord> {
    return this.http.post<ApiResponse<BackendAccountsPayable>>(this.baseUrl, body).pipe(
      map(res => this.toPayable(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  deletePayable(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  updatePayable(id: string, body: {
    invoiceNo?: string; invoiceAmount: number; dueDate?: string; note?: string;
  }): Observable<AccountsPayableRecord> {
    return this.http.put<ApiResponse<BackendAccountsPayable>>(`${this.baseUrl}/${id}`, body).pipe(
      map(res => this.toPayable(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /** Tong quan KPI: tong no con phai tra va tong no qua han. */
  getSummary(): Observable<{ totalRemaining: number; totalOverdue: number }> {
    return this.http.get<ApiResponse<{ totalRemaining: number; totalOverdue: number }>>(`${this.baseUrl}/summary`).pipe(
      map(res => res.data ?? { totalRemaining: 0, totalOverdue: 0 }),
      catchError(() => of({ totalRemaining: 0, totalOverdue: 0 })),
    );
  }

  /** Quét và đánh dấu công nợ quá hạn (gọi khi refresh). */
  triggerOverdueCheck(): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/overdue/trigger`, {}).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  /**
   * Danh sach NCC cho dropdown loc.
   * LUU Y: BE SupplierController gioi han size toi da 10 (@Max(10)) nen phai loop
   * tung trang thay vi xin size lon (se bi 400). Dung harmony voi getAvailablePOs.
   */
  getSuppliers(): Observable<SupplierOption[]> {
    const supplierUrl = this.applicationConfigService.getEndpointFor('api/v1/proc/suppliers');
    const pageSize = 10;
    const fetchPage = (page: number): Observable<SupplierOption[]> => {
      const params = new HttpParams().set('page', String(page)).set('size', String(pageSize));
      return this.http.get<ApiResponse<{ content: Array<{ id: string; name: string }> }>>(
        supplierUrl, { params }).pipe(
        map(res => (res.data?.content ?? []).map(s => ({ id: s.id, name: s.name }))),
        catchError(() => of([])),
      );
    };
    return fetchPage(0).pipe(
      expand((items, index) => (items.length < pageSize ? EMPTY : fetchPage(index + 1))),
      reduce((acc, items) => acc.concat(items), [] as SupplierOption[]),
    );
  }

  /** Danh sach purchaseOrderId da co trong accounts_payable. */
  getExistingPoIds(): Observable<Set<string>> {
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/existing-po-ids`).pipe(
      map(res => new Set(res.data ?? [])),
      catchError(() => of(new Set<string>())),
    );
  }

  /** Lay danh sach PO APPROVED/RECEIVED chua co AP cho dropdown. */
  getAvailablePOs(): Observable<{ id: string; poCode: string; totalAmount: number; supplierId: string; supplierName: string; paymentTermDays: number }[]> {
    const poUrl = this.applicationConfigService.getEndpointFor('api/v1/proc/purchase-orders');
    const poParams = new HttpParams().set('page', '0').set('size', '100');
    const po$ = this.http.get<ApiResponse<{ content: Array<{
      id: string; poCode: string; totalAmount: number; status: string;
      supplier?: { id: string; name: string } | null;
    }> }>>(poUrl, { params: poParams }).pipe(
      catchError(() => of({ data: { content: [] as any[] } })),
    );

    const existingPoIds$ = this.getExistingPoIds();

    const supplierUrl = this.applicationConfigService.getEndpointFor('api/v1/proc/suppliers');
    const supplierParams = new HttpParams().set('page', '0').set('size', '10');
    const supplier$ = this.http.get<ApiResponse<{ content: Array<{ id: string; name: string; paymentTermDays?: number }> }>>(supplierUrl, { params: supplierParams }).pipe(
      catchError(() => of({ data: { content: [] as any[] } })),
    );

    return forkJoin([po$, existingPoIds$, supplier$]).pipe(
      map(([poRes, existingPoIds, supRes]) => {
        const allPOs = poRes.data?.content ?? [];
        const supplierMap = new Map(
          (supRes.data?.content ?? []).map(s => [s.id, s])
        );

        return allPOs
          .filter(po => (po.status === 'APPROVED' || po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED')
                        && !existingPoIds.has(po.id))
          .map(po => {
            const supplierId = po.supplier?.id ?? '';
            const sup = supplierMap.get(supplierId);
            return {
              id: po.id,
              poCode: po.poCode,
              totalAmount: po.totalAmount,
              supplierId,
              supplierName: sup?.name || po.supplier?.name || 'N/A',
              paymentTermDays: sup?.paymentTermDays || 0,
            };
          });
      }),
    );
  }

  // ── Mapping helpers ────────────────────────────────────────────────

  private toPayable(b: BackendAccountsPayable): AccountsPayableRecord {
    return {
      id: b.id,
      supplierId: b.supplierId,
      supplierCode: b.supplierCode ?? '',
      supplierName: b.supplierName ?? '',
      purchaseOrderId: b.purchaseOrderId,
      poCode: b.poCode,
      invoiceNo: b.invoiceNo,
      invoiceAmount: b.invoiceAmount ?? 0,
      paidAmount: b.paidAmount ?? 0,
      remainingAmount: b.remainingAmount ?? 0,
      receivedDate: b.receivedDate,
      dueDate: b.dueDate,
      paymentTermDays: b.paymentTermDays,
      invoiceDate: b.invoiceDate,
      status: b.status as AccountsPayableRecord['status'],
      note: b.note,
      createdAt: b.createdAt,
    };
  }

  private toPayment(b: BackendPayment): PayablePayment {
    return {
      id: b.id,
      paymentDate: b.paymentDate,
      amount: b.amount,
      paymentMethod: b.paymentMethod,
      referenceNo: b.referenceNo,
      createdBy: b.createdBy,
      createdAt: b.createdAt,
    };
  }

  private errorMessage(err: unknown): string {
    const e = err as { status?: number; error?: { message?: string }; message?: string };
    if (e?.error?.message) return e.error.message;
    if (e?.message) return e.message;
    return 'Không thể kết nối tới máy chủ.';
  }
}
