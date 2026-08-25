import {Injectable, inject} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable, forkJoin, of, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {ApplicationConfigService} from '../../../core/config/application-config.service';
import {ApiResponseBE, PageResponseBE, formatInstant} from '../users/user.model';
import {
  Customer,
  CustomerDetailResponseBE,
  CustomerFilter,
  CustomerFormDTO,
  CustomerListResponse,
  CustomerStatus,
} from './customer.model';

@Injectable({providedIn: 'root'})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly  applicationConfigService = inject(ApplicationConfigService);

  private  static readonly FETCH_SIZE = 1000;

  private get customerApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/customers');
  }

  private toCustomer(a: CustomerDetailResponseBE): Customer {
    return {
      id: a.id,
      customerCode: a.customerCode,
      username: a.username,
      fullName: a.fullName,
      phone: a.phone ?? '',
      email: a.email ?? '',
      authProvider: a.authProvider,
      hasLocalPassword: a.hasLocalPassword,
      emailVerified: a.emailVerified,
      avatarUrl: a.avatarUrl ?? undefined,
      dateOfBirth: a.dateOfBirth ?? null,
      gender: a.gender ?? null,
      status: a.status,
      lastLoginAt: formatInstant(a.lastLoginAt),
      createdAt: formatInstant(a.createdAt),
      updatedAt: formatInstant(a.updatedAt),
    };
  }

  private fetchAll(): Observable<Customer[]> {
    const params = new HttpParams().set('page', '0').set('size', String (CustomerService.FETCH_SIZE));
    return this.http.get<ApiResponseBE<PageResponseBE<CustomerDetailResponseBE>>>(this.customerApi, {params})
      .pipe(map(res => (res.data?.content ?? []).map(a => this.toCustomer(a))));
  }

  getCustomers(filter: CustomerFilter): Observable<CustomerListResponse>{
    return this.fetchAll().pipe(
      map(all => this.applyFilter(all, filter)),
      catchError(err => throwError(() => err)),
    );
  }

  private applyFilter(all: Customer[], filter: CustomerFilter):CustomerListResponse{
    let result = [...all];

    if(filter.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter(
        u =>
          (u.fullName && u.fullName.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(q)) ||
          (u.customerCode && u.customerCode.toLowerCase().includes(q)) ||
          (u.gender && u.gender.toLowerCase().includes(q)),
      );
    }

    if (filter.status !== null && filter.status !== undefined){
      result = result.filter(u => u.status === filter.status)
    }

    if(filter.sortField) {
      const key = filter.sortField as keyof Customer;
      const isAsc = filter.sortOrder === 'ascend';
      result.sort((a, b) => {
        const valA = String(a[key] ?? '');
        const valB = String(b[key] ?? '');
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    } else {
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    const total = result.length;
    const pageIndex = filter.pageIndex && filter.pageIndex > 0 ? filter.pageIndex : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 10;
    const startIndex = (pageIndex - 1) * pageSize;
    const items = result.slice(startIndex, startIndex + pageSize);
    return {items, total, pageIndex, pageSize};
  }

  getCustomerById(id: string): Observable<Customer | null> {
    return this.http
      .get<ApiResponseBE<CustomerDetailResponseBE>>(`${this.customerApi}/${id}`)
      .pipe(map(res => (res.data ? this.toCustomer(res.data) : null)));
  }

  createCustomer(dto: CustomerFormDTO): Observable<Customer> {
    const body = {
      fullName: (dto.fullName || '').trim(),
      username: (dto.username || '').trim(),
      email: (dto.email || '').trim().toLowerCase(),
      phone: dto.phone ? dto.phone.trim() : null,
      password: dto.password || '',
      dateOfBirth: dto.dateOfBirth ?? null,
      gender: dto.gender ?? null,
      emailVerified: dto.emailVerified ?? false,
      status: dto.status,
      authProvider: 'LOCAL',
    };
    return this.http
      .post<ApiResponseBE<CustomerDetailResponseBE>>(this.customerApi, body)
      .pipe(map(res => this.toCustomer(res.data)));
  }

  updateCustomer(id: string, dto: Partial<CustomerFormDTO>): Observable<Customer> {
    const body: Partial<{
      fullName: string;
      username: string;
      email: string;
      phone: string | null;
      dateOfBirth: string | null;
      gender: string | null;
      emailVerified: boolean;
      status: CustomerStatus;
    }> = {};
    if (dto.fullName !== undefined) body.fullName = dto.fullName.trim();
    if (dto.username !== undefined) body.username = dto.username.trim();
    if (dto.email !== undefined) body.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) body.phone = dto.phone ? dto.phone.trim() : null;
    if (dto.dateOfBirth !== undefined) body.dateOfBirth = dto.dateOfBirth ?? null;
    if (dto.gender !== undefined) body.gender = dto.gender ?? null;
    if (dto.emailVerified !== undefined) body.emailVerified = dto.emailVerified;
    if (dto.status !== undefined) body.status = dto.status;
    return this.http
      .put<ApiResponseBE<CustomerDetailResponseBE>>(`${this.customerApi}/${id}`, body)
      .pipe(map(res => this.toCustomer(res.data)));
  }

  resetPassword(id: string, password: string): Observable<Customer> {
    return this.http
      .post<ApiResponseBE<CustomerDetailResponseBE>>(`${this.customerApi}/${id}/reset-password`, {password})
      .pipe(map(res => this.toCustomer(res.data)));
  }

  deleteCustomer(id: string): Observable<boolean> {
    return this.http
      .delete<ApiResponseBE<void>>(`${this.customerApi}/${id}`)
      .pipe(map(res => true));
  }

  deleteBatch(ids: string[]): Observable<boolean>{
    if (!ids.length) return of(true);
    const reqs = ids.map(id => this.http.delete<ApiResponseBE<void>>(`${this.customerApi}/${id}`));
    return forkJoin(reqs).pipe(map(() => true));
  }

  changeBatchStatus(ids: string[], status: CustomerStatus): Observable<boolean> {
    if (!ids.length) return of(true);
    const reqs = ids.map(id =>
      this.http.put<ApiResponseBE<CustomerDetailResponseBE>>(`${this.customerApi}/${id}`, {status}),
    );
    return forkJoin(reqs).pipe(map(() => true));
  }

}
