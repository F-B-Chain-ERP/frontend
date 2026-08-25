import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ApiResponse } from '../../login/login.model';
import { Scope, ScopePayload } from './scope.model';

/** Service quản trị phạm vi truy cập (CRUD) - gọi API thật `/api/v1/scopes`. */
@Injectable({ providedIn: 'root' })
export class ScopeManagementService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** Danh sách toàn bộ phạm vi kèm tên chi nhánh liên quan. */
  getAll(): Observable<Scope[]> {
    return this.http
      .get<ApiResponse<Scope[]>>(this.applicationConfigService.getEndpointFor('api/v1/scopes'))
      .pipe(map(res => res.data ?? []));
  }

  /** Chi tiết một phạm vi. */
  getById(id: string): Observable<Scope> {
    return this.http
      .get<ApiResponse<Scope>>(this.applicationConfigService.getEndpointFor(`api/v1/scopes/${id}`))
      .pipe(map(res => res.data));
  }

  /** Tạo mới phạm vi. Với ALL_SYSTEM không cần branchId. */
  create(payload: ScopePayload): Observable<Scope> {
    return this.http
      .post<ApiResponse<Scope>>(this.applicationConfigService.getEndpointFor('api/v1/scopes'), payload)
      .pipe(map(res => res.data));
  }

  /** Cập nhật phạm vi (các trường null giữ nguyên giá trị cũ phía BE). */
  update(id: string, payload: ScopePayload): Observable<Scope> {
    return this.http
      .put<ApiResponse<Scope>>(this.applicationConfigService.getEndpointFor(`api/v1/scopes/${id}`), payload)
      .pipe(map(res => res.data));
  }

  /** Xóa vĩnh viễn một phạm vi. */
  delete(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(this.applicationConfigService.getEndpointFor(`api/v1/scopes/${id}`))
      .pipe(map(() => undefined));
  }
}
