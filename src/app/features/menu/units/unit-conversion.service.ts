import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  CreateUnitConversionRequest,
  UnitConversion,
  UpdateUnitConversionRequest,
} from './unit-conversion.model';

/**
 * Kết nối API bảng quy đổi đơn vị (UnitConversionController, base /api/v1/inv/unit-conversions):
 * - GET    /api/v1/inv/unit-conversions
 * - GET    /api/v1/inv/unit-conversions/{id}
 * - POST   /api/v1/inv/unit-conversions
 * - PUT    /api/v1/inv/unit-conversions/{id}
 * - DELETE /api/v1/inv/unit-conversions/{id}
 * Quyền BE: inv:material:view/create/update/delete.
 */
@Injectable({
  providedIn: 'root',
})
export class UnitConversionService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/unit-conversions');
  }

  list(): Observable<UnitConversion[]> {
    return this.http.get<ApiResponse<UnitConversion[]>>(this.baseUrl).pipe(
      map(res => res.data ?? []),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  create(req: CreateUnitConversionRequest): Observable<UnitConversion> {
    return this.http.post<ApiResponse<UnitConversion>>(this.baseUrl, req).pipe(
      map(res => res.data as UnitConversion),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  update(id: string, req: UpdateUnitConversionRequest): Observable<UnitConversion> {
    return this.http.put<ApiResponse<UnitConversion>>(`${this.baseUrl}/${id}`, req).pipe(
      map(res => res.data as UnitConversion),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  delete(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`).pipe(
      map(() => true),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  private errorMessage(err: unknown): string {
    const e = err as {
      status?: number;
      error?: { message?: string; errorCode?: string; data?: unknown };
      message?: string;
    };
    const body = e?.error;
    if (body?.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
      const msgs = Object.values(body.data as Record<string, unknown>).filter(
        (v): v is string => typeof v === 'string' && v.trim().length > 0,
      );
      if (msgs.length > 0) {
        return msgs.join('; ');
      }
    }
    if (body?.message && body.message !== 'Validation error') {
      return body.message;
    }
    if (body?.message === 'Validation error') {
      return 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại.';
    }
    if (e?.message) {
      return e.message;
    }
    return 'Không thể kết nối tới máy chủ.';
  }
}
