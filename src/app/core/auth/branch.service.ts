import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { ApplicationConfigService } from '../config/application-config.service';
import { ApiResponse, BranchResponse } from '../../features/login/login.model';
import { StateStorageService } from './state-storage.service';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly stateStorageService = inject(StateStorageService);

  readonly branches = signal<BranchResponse[]>([]);
  readonly currentBranch = signal<BranchResponse | null>(null);
  readonly loading = signal<boolean>(false);

  /** Danh sách chi nhánh thuộc phạm vi (scope) của tài khoản đang đăng nhập. */
  getMine(): Observable<BranchResponse[]> {
    return this.http
      .get<ApiResponse<BranchResponse[]>>(this.applicationConfigService.getEndpointFor('api/v1/branches/mine'))
      .pipe(map(res => res.data ?? []));
  }

  /**
   * Tải danh sách chi nhánh và tự động xác định chi nhánh đang làm việc.
   */
  loadMine(): Observable<BranchResponse[]> {
    this.loading.set(true);
    return this.getMine().pipe(
      tap({
        next: list => {
          this.branches.set(list);
          this.loading.set(false);

          const storedId = this.stateStorageService.getSelectedBranch();
          if (storedId) {
            const matched = list.find(b => b.id === storedId);
            if (matched) {
              this.currentBranch.set(matched);
              return;
            }
          }

          if (list.length > 0) {
            this.currentBranch.set(list[0]);
            this.stateStorageService.storeSelectedBranch(list[0].id, list[0].name);
          } else {
            this.currentBranch.set(null);
          }
        },
        error: () => {
          this.loading.set(false);
        },
      }),
    );
  }

  /** Cập nhật chi nhánh làm việc hiện tại và lưu vào storage. */
  setCurrentBranch(branch: BranchResponse): void {
    this.currentBranch.set(branch);
    this.stateStorageService.storeSelectedBranch(branch.id, branch.name);
  }

  /** Xóa trạng thái chi nhánh hiện tại. */
  clearCurrentBranch(): void {
    this.currentBranch.set(null);
    this.branches.set([]);
  }
}
