import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ApiResponse } from '../../login/login.model';
import { Branch, BranchPayload } from './branch.model';

/** Service quản trị chi nhánh (CRUD) - gọi API thật `/api/v1/branches`. */
@Injectable({ providedIn: 'root' })
export class BranchManagementService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** Danh sách toàn bộ chi nhánh. */
  getAll(): Observable<Branch[]> {
    return this.http
      .get<ApiResponse<Branch[]>>(this.applicationConfigService.getEndpointFor('api/v1/branches'))
      .pipe(map(res => res.data ?? []));
  }

  /** Chi tiết một chi nhánh. */
  getById(id: string): Observable<Branch> {
    return this.http
      .get<ApiResponse<Branch>>(this.applicationConfigService.getEndpointFor(`api/v1/branches/${id}`))
      .pipe(map(res => res.data));
  }

  /** Tạo mới chi nhánh. */
  create(payload: BranchPayload): Observable<Branch> {
    return this.http
      .post<ApiResponse<Branch>>(this.applicationConfigService.getEndpointFor('api/v1/branches'), payload)
      .pipe(map(res => res.data));
  }

  /** Cập nhật chi nhánh (các trường null giữ nguyên giá trị cũ phía BE). */
  update(id: string, payload: BranchPayload): Observable<Branch> {
    return this.http
      .put<ApiResponse<Branch>>(this.applicationConfigService.getEndpointFor(`api/v1/branches/${id}`), payload)
      .pipe(map(res => res.data));
  }

  /** Xóa vĩnh viễn một chi nhánh. */
  delete(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(this.applicationConfigService.getEndpointFor(`api/v1/branches/${id}`))
      .pipe(map(() => undefined));
  }
}
