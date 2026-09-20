import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { PosApiService } from './pos-api.service';
import { SalesBranch } from '../models/pos.model';

const STORAGE_KEY = 'store_branch_id';

/**
 * Chi nhánh đặt món của kênh bán hàng (khách chọn nơi nhận/giao).
 * BE bắt branchId mọi API cart/order nhưng storefront trước đây không có khái niệm này.
 * Mặc định branch ACTIVE đầu tiên, khách đổi được, lưu localStorage.
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
      tap(list => {
        this.branches.set(list);
        const current = this.branchId();
        if (!current || !list.some(b => b.id === current)) {
          const fallback = list.find(b => b.supportsPickup) ?? list[0] ?? null;
          this.branchId.set(fallback ? fallback.id : null);
          if (fallback) localStorage.setItem(STORAGE_KEY, fallback.id);
          else localStorage.removeItem(STORAGE_KEY);
        }
      }),
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
