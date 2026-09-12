import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../login/login.model';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  CreateToppingRequest,
  Topping,
  ToppingFilter,
  ToppingListResponse,
  UpdateToppingRequest,
} from './topping.model';

interface BackendPageResponse {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: Topping[];
}

/**
 * Kết nối API thật của backend (ToppingController, base /api/v1/menu/toppings):
 * - GET    /api/v1/menu/toppings
 * - GET    /api/v1/menu/toppings/{id}
 * - POST   /api/v1/menu/toppings
 * - PUT    /api/v1/menu/toppings/{id}
 * - DELETE /api/v1/menu/toppings/{id}
 */
@Injectable({
  providedIn: 'root',
})
export class ToppingService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/menu/toppings');
  }

  getToppings(filter: ToppingFilter): Observable<ToppingListResponse> {
    let params = new HttpParams()
      .set('page', String(Math.max((filter.page ?? 1) - 1, 0)))
      .set('size', String(filter.size ?? 10));
    if (filter.search?.trim()) {
      params = params.set('search', filter.search.trim());
    }
    if (filter.groupName?.trim()) {
      params = params.set('groupName', filter.groupName.trim());
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    return this.http.get<ApiResponse<BackendPageResponse>>(this.baseUrl, { params }).pipe(
      map(res => {
        const page = res.data;
        const content = page?.content ?? [];
        return {
          items: content,
          total: page?.totalElements ?? 0,
          pageIndex: (page?.pageNumber ?? 0) + 1,
          pageSize: page?.pageSize ?? filter.size ?? 10,
        };
      }),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  getTopping(id: string): Observable<Topping> {
    return this.http.get<ApiResponse<Topping>>(`${this.baseUrl}/${id}`).pipe(
      map(res => res.data as Topping),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  create(req: CreateToppingRequest): Observable<Topping> {
    return this.http.post<ApiResponse<Topping>>(this.baseUrl, req).pipe(
      map(res => res.data as Topping),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  update(id: string, req: UpdateToppingRequest): Observable<Topping> {
    return this.http.put<ApiResponse<Topping>>(`${this.baseUrl}/${id}`, req).pipe(
      map(res => res.data as Topping),
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
