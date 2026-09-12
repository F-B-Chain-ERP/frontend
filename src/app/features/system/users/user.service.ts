import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  AccountResponseBE,
  ApiResponseBE,
  PageResponseBE,
  User,
  UserFilter,
  UserFormDTO,
  UserListResponse,
  UserStatus,
  backendStatusToUserStatus,
  formatInstant,
} from './user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get accountApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/accounts');
  }

  private toUser(a: AccountResponseBE): User {
    return {
      id: a.id,
      username: a.username,
      fullName: a.fullName,
      email: a.email,
      phoneNumber: a.phone ?? '',
      status: backendStatusToUserStatus(a.status),
      primaryBranchId: a.primaryBranchId ?? null,
      primaryBranchName: a.primaryBranchName ?? undefined,
      assignedBranches: a.assignedBranches ?? [],
      roles: a.roles ?? [],
      roleIds: a.roleIds ?? [],
      department: '',
      createdAt: formatInstant(a.createdAt),
      updatedAt: formatInstant(a.updatedAt),
      avatar: a.avatarUrl ?? undefined,
      note: '',
    };
  }

  /**
   * Fix 2+3: phân trang + search + lọc status/branch HOÀN TOÀN phía server.
   * - Chỉ 1 HTTP request / lần load (trước đây: 1 accounts + 1 roles + N assignments).
   * - Dùng luôn roles/roleIds/assignedBranches BE đã enrich sẵn trong AccountResponse,
   *   không gọi lại /role-assignments/account/{id} từng user nữa.
   */
  getUsers(filter: UserFilter): Observable<UserListResponse> {
    const pageIndex = filter.pageIndex && filter.pageIndex > 0 ? filter.pageIndex : 1;
    // Màn account cố định 10 dòng/trang: luôn xin đúng 10 record/lần.
    const pageSize = 10;
    let params = new HttpParams().set('page', String(pageIndex - 1)).set('size', String(pageSize));
    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }
    if (filter.branchId) {
      params = params.set('branchId', filter.branchId);
    }
    if (filter.status !== null && filter.status !== undefined) {
      params = params.set('status', Number(filter.status) === UserStatus.ACTIVE ? 'ACTIVE' : 'INACTIVE');
    }

    return this.http.get<ApiResponseBE<PageResponseBE<AccountResponseBE>>>(this.accountApi, { params }).pipe(
      map(res => {
        let items = (res.data?.content ?? []).map(a => this.toUser(a));
        // Sort chỉ trên items của trang hiện tại (pageSize dòng) — rẻ, giữ hành vi sort UI.
        // Sort toàn cục theo ngày tạo đã do BE đảm nhận (ORDER BY createdAt DESC).
        if (filter.sortField) {
          const key = filter.sortField as keyof User;
          const isAsc = filter.sortOrder === 'ascend';
          items = [...items].sort((a, b) => {
            const valA = String(a[key] ?? '');
            const valB = String(b[key] ?? '');
            return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
          });
        }
        return {
          items,
          total: res.data?.totalElements ?? 0,
          pageIndex,
          pageSize,
        };
      }),
      catchError(err => throwError(() => err)),
    );
  }

  /**
   * Lấy chi tiết người dùng theo ID
   */
  getUserById(id: string | number): Observable<User | null> {
    return this.http
      .get<ApiResponseBE<AccountResponseBE>>(`${this.accountApi}/${id}`)
      .pipe(map(res => (res.data ? this.toUser(res.data) : null)));
  }

  /**
   * Thêm mới người dùng (BE bắt buộc password + primaryBranchId + authProvider)
   */
  createUser(dto: UserFormDTO): Observable<User> {
    const body: Record<string, any> = {
      username: (dto.username || '').trim(),
      password: dto.password || '',
      fullName: (dto.fullName || '').trim(),
      email: (dto.email || '').trim().toLowerCase(),
      phone: dto.phoneNumber ? dto.phoneNumber.trim() : null,
      primaryBranchId: dto.primaryBranchId || null,
      authProvider: 'LOCAL',
    };
    if (dto.roleIds?.length) {
      body['roleIds'] = dto.roleIds;
    }
    return this.http.post<ApiResponseBE<AccountResponseBE>>(this.accountApi, body).pipe(map(res => this.toUser(res.data)));
  }

  /**
   * Cập nhật thông tin người dùng
   */
  updateUser(id: string | number, dto: Partial<UserFormDTO>): Observable<User> {
    const body: Record<string, any> = {
      fullName: dto.fullName?.trim(),
      email: dto.email?.trim().toLowerCase(),
      phone: dto.phoneNumber ? dto.phoneNumber.trim() : null,
      status: dto.status !== undefined ? (Number(dto.status) === UserStatus.ACTIVE ? 'ACTIVE' : 'INACTIVE') : null,
    };
    if (dto.primaryBranchId !== undefined) {
      body['primaryBranchId'] = dto.primaryBranchId;
    }
    if (dto.roleIds !== undefined) {
      body['roleIds'] = dto.roleIds;
    }
    if (dto.branchRoles !== undefined) {
      body['branchRoles'] = dto.branchRoles;
    }
    return this.http.put<ApiResponseBE<AccountResponseBE>>(`${this.accountApi}/${id}`, body).pipe(map(res => this.toUser(res.data)));
  }

  /**
   * Đổi trạng thái hoạt động người dùng (toggle)
   */
  toggleStatus(id: string | number): Observable<User> {
    return this.http.get<ApiResponseBE<AccountResponseBE>>(`${this.accountApi}/${id}`).pipe(
      switchMap(res => {
        const current = res.data;
        if (!current) {
          return throwError(() => new Error('Người dùng không tồn tại'));
        }
        const newStatus = current.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        return this.http
          .put<ApiResponseBE<AccountResponseBE>>(`${this.accountApi}/${id}`, {
            status: newStatus,
          })
          .pipe(map(r => this.toUser(r.data)));
      }),
    );
  }

  /**
   * Xóa người dùng theo ID
   */
  deleteUser(id: string | number): Observable<boolean> {
    return this.http.delete<ApiResponseBE<void>>(`${this.accountApi}/${id}`).pipe(map(() => true));
  }

  /**
   * Xóa nhiều người dùng cùng lúc (gọi lặp từng ID)
   */
  deleteBatch(ids: (string | number)[]): Observable<boolean> {
    if (!ids.length) return of(true);
    const reqs = ids.map(id => this.http.delete<ApiResponseBE<void>>(`${this.accountApi}/${id}`));
    return forkJoin(reqs).pipe(map(() => true));
  }

  /**
   * Đổi trạng thái hàng loạt (gọi lặp từng ID)
   */
  changeBatchStatus(ids: (string | number)[], status: UserStatus): Observable<boolean> {
    if (!ids.length) return of(true);
    const newStatus = Number(status) === UserStatus.ACTIVE ? 'ACTIVE' : 'INACTIVE';
    const reqs = ids.map(id =>
      this.http.put<ApiResponseBE<AccountResponseBE>>(`${this.accountApi}/${id}`, {
        status: newStatus,
      }),
    );
    return forkJoin(reqs).pipe(map(() => true));
  }
}
