import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from '../config/application-config.service';
import { ApiResponse, BranchResponse } from '../../features/login/login.model';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** Danh sách chi nhánh thuộc phạm vi (scope) của tài khoản đang đăng nhập. */
  getMine(): Observable<BranchResponse[]> {
    return this.http
      .get<ApiResponse<BranchResponse[]>>(this.applicationConfigService.getEndpointFor('api/v1/branches/mine'))
      .pipe(map(res => res.data ?? []));
  }
}
