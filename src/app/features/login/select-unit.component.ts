import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { FormsModule } from '@angular/forms';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzDropdownDirective, NzDropdownMenuComponent } from 'ng-zorro-antd/dropdown';
import { NzTableModule } from 'ng-zorro-antd/table';

import { BranchService } from '../../core/auth/branch.service';
import { LoginService } from '../login/login.service';
import { AccountService } from '../../core/auth/account.service';
import { StateStorageService } from '../../core/auth/state-storage.service';
import { AppNotificationService } from '../../shared/app-notification/app-notification.service';
import { LoginException } from '../login/login.model';
import { ThemeService } from '../../core/theme/theme.service';
import { StoreBranchService } from '../store/services/store-branch.service';

/**
 * Chi nhánh hiển thị trên trang chọn (dùng chung cho nhân viên và khách hàng).
 * Nhân viên: BranchResponse. Khách hàng: SalesBranch.
 */
interface SelectableBranch {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  status?: string | null;
  parentName?: string | null;
}

/**
 * Trang chọn chi nhánh dùng cho cả nhân viên (chọn đơn vị công tác) và
 * khách hàng (chọn chi nhánh đặt món). Dùng chung 1 giao diện:
 * - Nhân viên: load getMine() + POST auth/select-branch -> /admin/home
 * - Khách hàng: load /sales/branches + lưu localStorage -> /store
 */
@Component({
  selector: 'app-select-unit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NzButtonModule,
    NzCardModule,
    NzSpinModule,
    NzEmptyModule,
    FormsModule,
    NzIconDirective,
    NzDropdownDirective,
    NzDropdownMenuComponent,
    NzTableModule,
  ],
  templateUrl: './select-unit.component.html',
  styleUrls: ['./login-select-unit.scss'],
  standalone: true,
})
export class SelectUnitComponent implements OnInit, OnDestroy {
  private readonly branchService = inject(BranchService);
  private readonly storeBranches = inject(StoreBranchService);
  private readonly loginService = inject(LoginService);
  private readonly accountService = inject(AccountService);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly toast = inject(AppNotificationService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly branches = signal<SelectableBranch[]>([]);
  readonly loading = signal(true);
  readonly selecting = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly isDropdownOpen = signal(false);
  readonly searchTerm = signal('');
  readonly hasActiveSession = signal(false);
  readonly currentAccount = this.accountService.account;

  readonly isCustomer = computed(() => this.currentAccount()?.principalType === 'CUSTOMER');

  readonly titleText = computed(() => (this.isCustomer() ? 'CHỌN CHI NHÁNH' : 'CHỌN ĐƠN VỊ LÀM VIỆC'));
  readonly subtitleText = computed(() =>
    this.isCustomer() ? 'Vui lòng chọn chi nhánh để đặt món' : 'Vui lòng chọn đơn vị/chi nhánh để tiếp tục',
  );
  readonly labelText = computed(() => (this.isCustomer() ? 'Chi nhánh' : 'Đơn vị / Chi nhánh'));
  readonly placeholderText = computed(() =>
    this.isCustomer() ? 'Chọn chi nhánh đặt món...' : 'Chọn đơn vị / chi nhánh làm việc...',
  );
  readonly emptyText = computed(() =>
    this.isCustomer()
      ? 'Hiện chưa có chi nhánh nào hoạt động. Vui lòng quay lại sau.'
      : 'Tài khoản chưa được gán phạm vi chi nhánh nào. Vui lòng liên hệ quản trị viên.',
  );
  readonly backText = computed(() => (this.isCustomer() ? 'Quay lại cửa hàng' : 'Quay lại hệ thống'));
  readonly footerTipText = computed(() =>
    this.isCustomer()
      ? '💡 Nhấp để chọn chi nhánh &bull; Nhấp đúp để chọn và vào cửa hàng ngay'
      : '💡 Nhấp để chọn đơn vị &bull; Nhấp đúp để chọn và đăng nhập ngay',
  );
  readonly submitSelectedText = computed(() => (this.isCustomer() ? 'Vào cửa hàng tại: ' : 'Vào làm việc với: '));
  readonly submitFallbackText = computed(() => (this.isCustomer() ? 'Vào cửa hàng' : 'Đăng nhập'));

  readonly selectedBranch = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.branches().find(b => b.id === id) ?? null;
  });

  readonly filteredBranches = computed(() => {
    const list = this.branches();
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter(
      b =>
        b.name?.toLowerCase().includes(query) ||
        b.code?.toLowerCase().includes(query) ||
        b.address?.toLowerCase().includes(query) ||
        b.phone?.toLowerCase().includes(query) ||
        b.parentName?.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    // Nhân viên được ép về chế độ sáng (giống trang login); khách hàng theo đúng theme của app.
    if (!this.isCustomer()) {
      this.theme.applyModeVisualOnly('light');
    }
    if (!this.stateStorageService.getAuthenticationToken()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.isCustomer()) {
      this.hasActiveSession.set(this.storeBranches.branchId() !== null);
    } else {
      this.hasActiveSession.set(!this.stateStorageService.hasPendingScopeAssignment());
    }

    if (this.isCustomer()) {
      this.storeBranches.loadBranches().subscribe({
        next: list => this.onBranchesLoaded(list),
        error: () => this.onBranchesLoadError(),
      });
    } else {
      this.branchService.getMine().subscribe({
        next: list => this.onBranchesLoaded(list),
        error: () => this.onBranchesLoadError(),
      });
    }
  }

  private onBranchesLoaded(list: readonly SelectableBranch[]): void {
    const items = (list ?? []) as SelectableBranch[];
    this.branches.set(items);
    this.loading.set(false);

    const storedId = this.isCustomer() ? this.storeBranches.branchId() : this.stateStorageService.getSelectedBranch();
    if (storedId && items.some(b => b.id === storedId)) {
      this.selectedId.set(storedId);
    } else if (items.length === 1) {
      this.selectedId.set(items[0].id);
    }
  }

  private onBranchesLoadError(): void {
    this.loading.set(false);
    this.toast.error('Không thể tải danh sách chi nhánh. Vui lòng thử lại.');
  }

  ngOnDestroy(): void {
    this.theme.restoreSavedMode();
  }

  onSelectBranch(branch: SelectableBranch): void {
    this.selectedId.set(branch.id);
  }

  onSelectRow(branch: SelectableBranch): void {
    this.selectedId.set(branch.id);
    this.isDropdownOpen.set(false);
  }

  onDoubleClickBranch(branch: SelectableBranch): void {
    this.selectedId.set(branch.id);
    this.submit();
  }

  onDoubleClickRow(branch: SelectableBranch): void {
    this.selectedId.set(branch.id);
    this.isDropdownOpen.set(false);
    this.submit();
  }

  clearSelection(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedId.set(null);
  }

  submit(): void {
    const id = this.selectedId();
    if (!id || this.selecting()) {
      return;
    }

    if (this.isCustomer()) {
      this.selecting.set(true);
      this.storeBranches.selectBranch(id);
      this.router.navigate(['/store']);
      return;
    }

    this.selecting.set(true);
    this.loginService.selectBranch(id).subscribe({
      next: () => {
        const matched = this.branches().find(b => b.id === id);
        if (matched) {
          this.branchService.setCurrentBranch(matched);
        }
        this.router.navigate(['/admin/home']);
      },
      error: (err: unknown) => {
        this.selecting.set(false);
        const message = err instanceof LoginException ? err.message : 'Chọn chi nhánh thất bại, vui lòng thử lại.';
        this.toast.error(message);
      },
    });
  }

  goBack(): void {
    this.router.navigate(this.isCustomer() ? ['/store'] : ['/admin/home']);
  }

  get initials(): string {
    const login = this.currentAccount()?.login ?? '';
    return login ? login.charAt(0).toUpperCase() : 'U';
  }

  logout(): void {
    this.loginService.logout().subscribe();
  }
}

export default SelectUnitComponent;