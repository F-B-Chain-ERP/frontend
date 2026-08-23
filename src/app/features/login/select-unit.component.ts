import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';

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
  imports: [NzButtonModule, NzCardModule, NzSpinModule, NzGridModule, NzEmptyModule, FormsModule, NzSelectModule],
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
  readonly currentAccount = this.accountService.account;

  ngOnInit(): void {
    this.theme.applyModeVisualOnly('light');
    if (!this.stateStorageService.getAuthenticationToken()) {
      this.router.navigate(['/login']);
      return;
    }
    if (!this.stateStorageService.hasPendingScopeAssignment()) {
      this.router.navigate(['/admin/home']);
      return;
    }
    this.branchService.getMine().subscribe({
      next: list => {
        this.branches.set(list ?? []);
        this.loading.set(false);
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

  submit(): void {
    const id = this.selectedId();
    if (!id || this.selecting()) {
      return;
    }
    this.selecting.set(true);
    this.loginService.selectBranch(id).subscribe({
      next: () => this.router.navigate(['/admin/home']),
      error: (err: unknown) => {
        this.selecting.set(false);
        const message = err instanceof LoginException ? err.message : 'Chọn chi nhánh thất bại, vui lòng thử lại.';
        this.toast.error(message);
      },
    });
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
