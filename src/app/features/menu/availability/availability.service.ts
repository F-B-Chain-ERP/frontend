import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {ApiResponse} from '../../login/login.model';
import {ApplicationConfigService} from '../../../core/config/application-config.service';
import {
  BranchProductAvailability,
  BranchToppingAvailability,
  UpdateAvailabilityRequest,
  AvailabilityPageResponse,
} from './availability.model';

@Injectable({providedIn: 'root'})
export class AvailabilityService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.appConfig.getEndpointFor('api/v1/menu/branches');
  }

  listProducts(
    branchId: string,
    page: number,
    size: number,
    search?: string,
    status?: string,
    categoryId?: string,
  ): Observable<AvailabilityPageResponse<BranchProductAvailability>> {
    let params = new HttpParams()
      .set('page', String(Math.max(page, 0)))
      .set('size', String(size));
    if (search?.trim()) params = params.set('search', search.trim());
    if (status) params = params.set('status', status);
    if (categoryId) params = params.set('categoryId', categoryId);

    return this.http
      .get<ApiResponse<AvailabilityPageResponse<BranchProductAvailability>>>(
        `${this.baseUrl}/${branchId}/products`,
        {params},
      )
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  updateProduct(
    branchId: string,
    productId: string,
    request: UpdateAvailabilityRequest,
  ): Observable<BranchProductAvailability> {
    return this.http
      .put<ApiResponse<BranchProductAvailability>>(
        `${this.baseUrl}/${branchId}/products/${productId}`,
        request,
      )
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  listToppings(
    branchId: string,
    page: number,
    size: number,
    search?: string,
    status?: string,
  ): Observable<AvailabilityPageResponse<BranchToppingAvailability>> {
    let params = new HttpParams()
      .set('page', String(Math.max(page, 0)))
      .set('size', String(size));
    if (search?.trim()) params = params.set('search', search.trim());
    if (status) params = params.set('status', status);

    return this.http
      .get<ApiResponse<AvailabilityPageResponse<BranchToppingAvailability>>>(
        `${this.baseUrl}/${branchId}/toppings`,
        {params},
      )
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  updateTopping(
    branchId: string,
    toppingId: string,
    request: UpdateAvailabilityRequest,
  ): Observable<BranchToppingAvailability> {
    return this.http
      .put<ApiResponse<BranchToppingAvailability>>(
        `${this.baseUrl}/${branchId}/toppings/${toppingId}`,
        request,
      )
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => new Error(this.errorMessage(err)))),
      );
  }

  private errorMessage(err: unknown): string {
    const e = err as {error?: {message?: string}; message?: string};
    return e?.error?.message || e?.message || 'Không thể kết nối tới máy chủ.';
  }
}
