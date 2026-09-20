import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { PosApiService } from './pos-api.service';
import { SalesBranch } from '../models/pos.model';

const STORAGE_KEY = 'store_branch_id';

/**
 * Chi nhánh đặt món của kênh bán hàng (khách chọn nơi nhận/giao).
 * BE bắt branchId mọi API cart/order. Chỉ gán branchId khi khách chủ động
 * chọn (trang /select-branch hoặc dropdown trên /store), không tự động chọn thay khách.
 */
@Injectable({
  providedIn: 'root',
})
export class StoreBranchService {
  readonly branches = signal<SalesBranch[]>([]);
  readonly branchId = signal<string | null>(localStorage.getItem(STORAGE_KEY));

  private readonly api = inject(PosApiService);
  loadBranches(): Observable<SalesBranch[]> {
    return this.api.getSalesBranches().pipe(
      tap(list => this.branches.set(list)),
      map(() => this.branches()),
    );
  }

  selectBranch(branchId: string): void {
    this.branchId.set(branchId);
    localStorage.setItem(STORAGE_KEY, branchId);
  }

  currentBranch(): SalesBranch | null {
    const id = this.branchId();
    return this.branches().find(b => b.id === id) ?? null;
  }
}
