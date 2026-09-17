import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ApiResponse } from '../../login/login.model';
import { BatchUpdateBranchHoursRequest, BranchHours } from './branch-hours.model';

@Injectable({
  providedIn: 'root',
})
export class BranchHoursService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private getHoursApi(branchId: string): string {
    return this.applicationConfigService.getEndpointFor(`api/v1/branches/${branchId}/hours`);
  }

  /**
   * Lấy lịch hoạt động 7 ngày trong tuần của chi nhánh (Thứ Hai đến Chủ Nhật).
   */
  getHours(branchId: string): Observable<BranchHours[]> {
    return this.http.get<ApiResponse<BranchHours[]>>(this.getHoursApi(branchId)).pipe(
      map(res => res.data ?? []),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Cập nhật hàng loạt (Batch Update) 7 ngày trong tuần của chi nhánh.
   */
  updateHours(branchId: string, payload: BatchUpdateBranchHoursRequest): Observable<BranchHours[]> {
    return this.http.put<ApiResponse<BranchHours[]>>(this.getHoursApi(branchId), payload).pipe(
      map(res => res.data ?? []),
      catchError(err => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  /**
   * Giữ message nghiệp vụ BE sạch sẽ cho toast notification.
   */
  private errorMessage(err: unknown): string {
    const e = err as { error?: { message?: string }; message?: string };
    return e?.error?.message || e?.message || 'Đã xảy ra lỗi không xác định.';
  }
}
