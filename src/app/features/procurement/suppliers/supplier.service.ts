import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { Supplier, SupplierFilter, SupplierFormDTO, SupplierListResponse, SupplierStatus } from './supplier.model';

/** Shape of the backend paginated supplier list. */
interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: BackendSupplier[];
}

/** Shape of a supplier as returned by the backend. */
interface BackendSupplier {
  id: string;
  code: string;
  name: string;
  taxCode?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  paymentTermDays?: number | null;
  status?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
}

/** Field names expected by the backend create/update request. */
interface BackendSupplierRequest {
  code: string;
  name: string;
  taxCode?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  paymentTermDays?: number | null;
  status?: string | null;
}

const STATUS_TO_BACKEND: Record<SupplierStatus, string> = {
  [SupplierStatus.ACTIVE]: 'ACTIVE',
  [SupplierStatus.INACTIVE]: 'INACTIVE',
};

function statusFromBackend(value?: string | null): SupplierStatus {
  return value === 'ACTIVE' ? SupplierStatus.ACTIVE : SupplierStatus.INACTIVE;
}

/**
 * Kết nối với API thật của backend (SupplierController: /api/v1/proc/suppliers).
 * Giữ nguyên chữ ký public cũ (trả về Observable, shape giống mock) để component/UI
 * không bị thay đổi; chuyển đổi field giữa FE model và BE DTO bên trong service.
 */
@Injectable({
  providedIn: 'root',
})
export class SupplierService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/proc/suppliers');
  }

  getSuppliers(filter: SupplierFilter): Observable<SupplierListResponse> {
    const params = new URLSearchParams();
    params.set('page', String(Math.max((filter.pageIndex ?? 1) - 1, 0)));
    params.set('size', String(filter.pageSize ?? 10));
    if (filter.query?.trim()) {
      params.set('search', filter.query.trim());
    }
    if (filter.status !== null && filter.status !== undefined) {
      params.set('status', STATUS_TO_BACKEND[filter.status] ?? '');
    }

    return this.http.get<ApiResponse<BackendPageResponse>>(`${this.baseUrl}?${params.toString()}`).pipe(
      map(res => {
        const page = res.data;
        const content = page?.content ?? [];
        return {
          items: content.map(s => this.toSupplier(s)),
          total: page?.totalElements ?? 0,
          pageIndex: (page?.pageNumber ?? 0) + 1,
          pageSize: page?.pageSize ?? filter.pageSize ?? 10,
        };
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  getSupplierById(id: string | number): Observable<Supplier | null> {
    return this.http.get<ApiResponse<BackendSupplier>>(`${this.baseUrl}/${id}`).pipe(
      map(res => (res.data ? this.toSupplier(res.data) : null)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  createSupplier(dto: SupplierFormDTO): Observable<Supplier> {
    const body = this.toRequest(dto);
    return this.http.post<ApiResponse<BackendSupplier>>(this.baseUrl, body).pipe(
      map(res => this.toSupplier(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  updateSupplier(id: string | number, dto: Partial<SupplierFormDTO>): Observable<Supplier> {
    // Backend yêu cầu gửi đủ các trường (PUT), nên merge với dữ liệu hiện tại.
    return this.getSupplierById(id).pipe(
      switchMap(current => {
        if (!current) {
          return throwError(() => new Error('Nhà cung cấp không tồn tại'));
        }
        const merged: SupplierFormDTO = { ...this.toFormDTO(current), ...dto };
        const body = this.toRequest(merged);
        return this.http.put<ApiResponse<BackendSupplier>>(`${this.baseUrl}/${id}`, body).pipe(map(res => this.toSupplier(res.data)));
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  toggleStatus(id: string | number): Observable<Supplier> {
    return this.getSupplierById(id).pipe(
      switchMap(current => {
        if (!current) {
          return throwError(() => new Error('Nhà cung cấp không tồn tại'));
        }
        const newStatus = current.status === SupplierStatus.ACTIVE ? SupplierStatus.INACTIVE : SupplierStatus.ACTIVE;
        return this.updateSupplier(id, { status: newStatus });
      }),
    );
  }

  deleteSupplier(id: string | number): Observable<boolean> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`).pipe(
      map(() => true),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  // ── Mapping helpers ────────────────────────────────────────────────

  private toSupplier(s: BackendSupplier): Supplier {
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      phoneNumber: s.phone ?? undefined,
      email: s.email ?? undefined,
      address: s.address ?? undefined,
      taxCode: s.taxCode ?? undefined,
      contactPerson: s.contactName ?? undefined,
      status: statusFromBackend(s.status),
      paymentTermDays: s.paymentTermDays ?? undefined,
      createdAt: s.createdAt ?? '',
    };
  }

  private toFormDTO(s: Supplier): SupplierFormDTO {
    return {
      code: s.code,
      name: s.name,
      phoneNumber: s.phoneNumber,
      email: s.email,
      address: s.address,
      taxCode: s.taxCode,
      contactPerson: s.contactPerson,
      status: s.status,
      paymentTermDays: s.paymentTermDays,
      note: s.note,
    };
  }

  private toRequest(dto: SupplierFormDTO): BackendSupplierRequest {
    return {
      code: (dto.code || '').trim(),
      name: (dto.name || '').trim(),
      taxCode: (dto.taxCode || '').trim() || null,
      contactName: (dto.contactPerson || '').trim() || null,
      phone: (dto.phoneNumber || '').trim() || null,
      email: (dto.email || '').trim() || null,
      address: (dto.address || '').trim() || null,
      paymentTermDays: dto.paymentTermDays != null ? Number(dto.paymentTermDays) : null,
      status: STATUS_TO_BACKEND[dto.status] ?? 'ACTIVE',
    };
  }

  private errorMessage(err: unknown): string {
    const e = err as { status?: number; error?: { message?: string }; message?: string };
    if (e?.error?.message) {
      return e.error.message;
    }
    if (e?.message) {
      return e.message;
    }
    return 'Không thể kết nối tới máy chủ.';
  }
}
