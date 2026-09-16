import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ApiResponse } from '../../login/login.model';
import {
  Voucher,
  VoucherBranch,
  VoucherDetail,
  VoucherFilter,
  VoucherFormDTO,
  VoucherListResponse,
  VoucherStatus,
  VoucherUsage,
  VoucherUsageListResponse,
} from './voucher.model';

interface BackendPageResponse<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

interface BackendVoucher {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  usageLimit?: number | null;
  usedCount: number;
  usageLimitPerCustomer?: number | null;
  startAt: string;
  endAt: string;
  status: string;
  createdBy?: string | null;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

interface BackendVoucherBranch {
  id: string;
  voucherId: string;
  branchId: string;
  branchName?: string | null;
  status: string;
  createdAt?: string | null;
}

interface BackendVoucherUsage {
  id: string;
  voucherId: string;
  orderId: string;
  customerId?: string | null;
  discountAmount: number;
  usedAt: string;
  status: string;
  createdAt?: string | null;
}

interface BackendVoucherDetail {
  voucher: BackendVoucher;
  branches: BackendVoucherBranch[];
}

/**
 * Kết nối API voucher: CRUD + gán chi nhánh + lịch sử sử dụng.
 * BE: VoucherController / VoucherBranchController (base /api/v1/menu/vouchers).
 */
@Injectable({ providedIn: 'root' })
export class VoucherService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/menu/vouchers');
  }

  getVouchers(filter: VoucherFilter): Observable<VoucherListResponse> {
    let params = new HttpParams().set('page', String(Math.max((filter.pageIndex ?? 1) - 1, 0))).set('size', String(filter.pageSize ?? 10));
    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }

    return this.http.get<ApiResponse<BackendPageResponse<BackendVoucher>>>(this.baseUrl, { params }).pipe(
      map(res => {
        const page = res.data;
        return {
          items: (page?.content ?? []).map(v => this.toVoucher(v)),
          total: page?.totalElements ?? 0,
          pageIndex: (page?.pageNumber ?? 0) + 1,
          pageSize: page?.pageSize ?? filter.pageSize ?? 10,
        };
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  getVoucherDetail(id: string): Observable<VoucherDetail> {
    return this.http.get<ApiResponse<BackendVoucherDetail>>(`${this.baseUrl}/${id}`).pipe(
      map(res => ({
        voucher: this.toVoucher(res.data.voucher),
        branches: (res.data.branches ?? []).map(b => this.toVoucherBranch(b)),
      })),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  createVoucher(dto: VoucherFormDTO): Observable<Voucher> {
    return this.http.post<ApiResponse<BackendVoucher>>(this.baseUrl, this.toRequest(dto)).pipe(
      map(res => this.toVoucher(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  updateVoucher(id: string, dto: VoucherFormDTO): Observable<Voucher> {
    return this.http.put<ApiResponse<BackendVoucher>>(`${this.baseUrl}/${id}`, this.toRequest(dto)).pipe(
      map(res => this.toVoucher(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  updateStatus(id: string, status: VoucherStatus): Observable<Voucher> {
    return this.http.patch<ApiResponse<BackendVoucher>>(`${this.baseUrl}/${id}/status`, { status }).pipe(
      map(res => this.toVoucher(res.data)),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  deleteVoucher(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`).pipe(
      map(() => true),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  getBranches(voucherId: string): Observable<VoucherBranch[]> {
    return this.http.get<ApiResponse<BackendVoucherBranch[]>>(`${this.baseUrl}/${voucherId}/branches`).pipe(
      map(res => (res.data ?? []).map(b => this.toVoucherBranch(b))),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  assignBranches(voucherId: string, branchIds: string[]): Observable<VoucherBranch[]> {
    return this.http.post<ApiResponse<BackendVoucherBranch[]>>(`${this.baseUrl}/${voucherId}/branches`, { branchIds }).pipe(
      map(res => (res.data ?? []).map(b => this.toVoucherBranch(b))),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  removeBranch(voucherId: string, branchId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${voucherId}/branches/${branchId}`).pipe(
      map(() => true),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  getVoucherUsage(voucherId: string, pageIndex: number, pageSize: number): Observable<VoucherUsageListResponse> {
    const params = new HttpParams().set('page', String(Math.max(pageIndex - 1, 0))).set('size', String(pageSize));
    return this.http.get<ApiResponse<BackendPageResponse<BackendVoucherUsage>>>(`${this.baseUrl}/${voucherId}/usage`, { params }).pipe(
      map(res => {
        const page = res.data;
        return {
          items: (page?.content ?? []).map(u => this.toVoucherUsage(u)),
          total: page?.totalElements ?? 0,
          pageIndex: (page?.pageNumber ?? 0) + 1,
          pageSize: page?.pageSize ?? pageSize,
        };
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  // ── Mapping helpers ────────────────────────────────────────────────

  private toVoucher(v: BackendVoucher): Voucher {
    return {
      id: v.id,
      code: v.code,
      name: v.name,
      description: v.description ?? undefined,
      discountType: (v.discountType as Voucher['discountType']) ?? 'FIXED',
      discountValue: v.discountValue,
      maxDiscountAmount: v.maxDiscountAmount ?? null,
      minOrderAmount: v.minOrderAmount,
      usageLimit: v.usageLimit ?? null,
      usedCount: v.usedCount ?? 0,
      usageLimitPerCustomer: v.usageLimitPerCustomer ?? null,
      startAt: v.startAt,
      endAt: v.endAt,
      status: (v.status as Voucher['status']) ?? 'INACTIVE',
      createdBy: v.createdBy ?? undefined,
      createdAt: v.createdAt,
      updatedBy: v.updatedBy ?? undefined,
      updatedAt: v.updatedAt ?? undefined,
    };
  }

  private toVoucherBranch(b: BackendVoucherBranch): VoucherBranch {
    return {
      id: b.id,
      voucherId: b.voucherId,
      branchId: b.branchId,
      branchName: b.branchName ?? undefined,
      status: b.status,
      createdAt: b.createdAt ?? undefined,
    };
  }

  private toVoucherUsage(u: BackendVoucherUsage): VoucherUsage {
    return {
      id: u.id,
      voucherId: u.voucherId,
      orderId: u.orderId,
      customerId: u.customerId ?? null,
      discountAmount: u.discountAmount,
      usedAt: u.usedAt,
      status: u.status,
    };
  }

  private toRequest(dto: VoucherFormDTO): Omit<BackendVoucher, 'id' | 'usedCount' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'createdBy'> {
    return {
      code: (dto.code || '').trim().toUpperCase(),
      name: (dto.name || '').trim(),
      description: (dto.description ?? '').trim() || null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      minOrderAmount: dto.minOrderAmount ?? 0,
      usageLimit: dto.usageLimit ?? null,
      usageLimitPerCustomer: dto.usageLimitPerCustomer ?? null,
      startAt: dto.startAt,
      endAt: dto.endAt,
      status: dto.status,
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
