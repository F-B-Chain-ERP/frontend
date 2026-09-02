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
import { BranchResponse, LoginException } from '../login/login.model';
import { ThemeService } from '../../core/theme/theme.service';

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
  private readonly loginService = inject(LoginService);
  private readonly accountService = inject(AccountService);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly toast = inject(AppNotificationService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly branches = signal<BranchResponse[]>([]);
  readonly loading = signal(true);
  readonly selecting = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly isDropdownOpen = signal(false);
  readonly searchTerm = signal('');
  readonly hasActiveSession = signal(false);
  readonly currentAccount = this.accountService.account;

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
    this.theme.applyModeVisualOnly('light');
    if (!this.stateStorageService.getAuthenticationToken()) {
      this.router.navigate(['/login']);
      return;
    }

    // Nếu đã hoàn thành chọn đơn vị trước đó thì đánh dấu có session active
    this.hasActiveSession.set(!this.stateStorageService.hasPendingScopeAssignment());

    this.branchService.getMine().subscribe({
      next: list => {
        const items = list ?? [];
        this.branches.set(items);
        this.loading.set(false);

        // Pre-select chi nhánh hiện tại nếu có
        const currentSelectedId = this.stateStorageService.getSelectedBranch();
        if (currentSelectedId && items.some(b => b.id === currentSelectedId)) {
          this.selectedId.set(currentSelectedId);
        } else if (items.length === 1) {
          this.selectedId.set(items[0].id);
        }
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Không thể tải danh sách chi nhánh. Vui lòng thử lại.');
      },
    });
  }

  ngOnDestroy(): void {
    this.theme.restoreSavedMode();
  }

  onSelectBranch(branch: BranchResponse): void {
    this.selectedId.set(branch.id);
  }

  onSelectRow(branch: BranchResponse): void {
    this.selectedId.set(branch.id);
    this.isDropdownOpen.set(false);
  }

  onDoubleClickBranch(branch: BranchResponse): void {
    this.selectedId.set(branch.id);
    this.submit();
  }

  onDoubleClickRow(branch: BranchResponse): void {
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
    this.router.navigate(['/admin/home']);
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
