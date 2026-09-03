import {Injectable, inject} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable, forkJoin, of, throwError} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {ApplicationConfigService} from '../../../core/config/application-config.service';
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

  // Lấy toàn bộ tài khoản (BE list chỉ hỗ trợ tìm kiếm tự do + phân trang,
  // không hỗ trợ lọc trạng thái / sort) -> ta fetch hết rồi lọc/sort/trang trên client
  // để giữ nguyên toàn bộ hành vi UI hiện tại.
  private static readonly FETCH_SIZE = 1000;

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
      branches: a.branches ?? [],
      roles: a.roles ?? [],
      roleIds: a.roleIds ?? [],
      department: '',
      createdAt: formatInstant(a.createdAt),
      updatedAt: formatInstant(a.updatedAt),
      avatar: a.avatarUrl ?? undefined,
      note: '',
    };
  }

  private fetchAll(): Observable<User[]> {
    const params = new HttpParams()
      .set('page', '0')
      .set('size', String(UserService.FETCH_SIZE));
    return this.http
      .get<ApiResponseBE<PageResponseBE<AccountResponseBE>>>(this.accountApi, {params})
      .pipe(map(res => (res.data?.content ?? []).map(a => this.toUser(a))));
  }

  /**
   * Lấy danh sách người dùng có phân trang, tìm kiếm và lọc.
   * Dữ liệu từ BE được lọc/sort/phân trang trên client để đồng bộ với UI cũ.
   */
  getUsers(filter: UserFilter): Observable<UserListResponse> {
    return this.fetchAll().pipe(
      map(all => this.applyFilter(all, filter)),
      catchError(err => throwError(() => err)),
    );
  }

  private applyFilter(all: User[], filter: UserFilter): UserListResponse {
    let result = [...all];

    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter(
        u =>
          (u.fullName && u.fullName.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.phoneNumber && u.phoneNumber.includes(q)) ||
          (u.primaryBranchName && u.primaryBranchName.toLowerCase().includes(q)) ||
          (u.department && u.department.toLowerCase().includes(q)),
      );
    }

    if (filter.status !== null && filter.status !== undefined) {
      result = result.filter(u => u.status === Number(filter.status));
    }

    if (filter.branchId) {
      result = result.filter(u => u.primaryBranchId === filter.branchId);
    }

    if (filter.sortField) {
      const key = filter.sortField as keyof User;
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
    if (dto.roleIds && dto.roleIds.length) {
      body['roleIds'] = dto.roleIds;
    }
    return this.http
      .post<ApiResponseBE<AccountResponseBE>>(this.accountApi, body)
      .pipe(map(res => this.toUser(res.data)));
  }

  /**
   * Cập nhật thông tin người dùng
   */
  updateUser(id: string | number, dto: Partial<UserFormDTO>): Observable<User> {
    const body: Record<string, any> = {
      fullName: dto.fullName?.trim(),
      email: dto.email?.trim().toLowerCase(),
      phone: dto.phoneNumber ? dto.phoneNumber.trim() : null,
      status:
        dto.status !== undefined
          ? Number(dto.status) === UserStatus.ACTIVE
            ? 'ACTIVE'
            : 'INACTIVE'
          : null,
    };
    if (dto.primaryBranchId !== undefined) {
      body['primaryBranchId'] = dto.primaryBranchId;
    }
    if (dto.roleIds !== undefined) {
      body['roleIds'] = dto.roleIds;
    }
    return this.http
      .put<ApiResponseBE<AccountResponseBE>>(`${this.accountApi}/${id}`, body)
      .pipe(map(res => this.toUser(res.data)));
  }

  /**
   * Đổi trạng thái hoạt động người dùng (toggle)
   */
  toggleStatus(id: string | number): Observable<User> {
    return this.http
      .get<ApiResponseBE<AccountResponseBE>>(`${this.accountApi}/${id}`)
      .pipe(
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
    return this.http
      .delete<ApiResponseBE<void>>(`${this.accountApi}/${id}`)
      .pipe(map(() => true));
  }

  /**
   * Xóa nhiều người dùng cùng lúc (gọi lặp từng ID)
   */
  deleteBatch(ids: (string | number)[]): Observable<boolean> {
    if (!ids.length) return of(true);
    const reqs = ids.map(id =>
      this.http.delete<ApiResponseBE<void>>(`${this.accountApi}/${id}`),
    );
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
