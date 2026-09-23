import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApplicationConfigService } from '../../../../core/config/application-config.service';
import { ApiResponse } from '../../../login/login.model';
import { RoleAssignmentResponseBE } from '../models/role.model';

export interface AccountBranchAssignment {
  assignmentId: string;
  roleId: string;
  scopeId: string | null;
  scopeType: string | null;
  branchId: string | null;
  status: string | null;
  expiresAt: string | null;
}

/** Gán/thu hồi vai trò theo phạm vi: /api/v1/role-assignments. */
@Injectable({
  providedIn: 'root',
})
export class RoleAssignmentService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private get baseUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/role-assignments');
  }

  getByAccount(accountId: string | number): Observable<AccountBranchAssignment[]> {
    return this.http.get<ApiResponse<RoleAssignmentResponseBE[]>>(`${this.baseUrl}/account/${accountId}`).pipe(
      map(res =>
        (res.data ?? []).map(a => ({
          assignmentId: a.id,
          roleId: a.roleId,
          scopeId: a.scope?.id ?? null,
          scopeType: a.scope?.scopeType ?? null,
          branchId: a.scope?.branchId ?? null,
          // BE trả toàn bộ assignments kể cả đã thu hồi (INACTIVE); caller phải
          // tự lọc hiệu lực, nếu không vai trò đã gỡ vẫn hiện như đang gán.
          status: a.status ?? null,
          expiresAt: a.expiresAt ?? null,
        })),
      ),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  private errorMessage(err: unknown): string {
    const e = err as { error?: { message?: string }; message?: string };
    return e?.error?.message || e?.message || 'Không thể tải phân quyền.';
  }
}
