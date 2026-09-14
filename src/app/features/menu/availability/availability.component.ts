import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { takeUntil } from 'rxjs';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { AvailabilityTableComponent } from './availability-table.component';
import { Branch } from '../../system/branches/branch.model';
import { BranchManagementService } from '../../system/branches/branch-management.service';

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzEmptyModule,
    NzIconModule,
    NzTagModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    HasSomeAuthorityDirective,
    AvailabilityTableComponent,
  ],
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.scss'],
})
export class AvailabilityComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  // ── Branch ──
  readonly branches = signal<Branch[]>([]);
  readonly selectedBranch = signal<Branch | null>(null);
  readonly selectedSection = signal<'product' | 'topping' | null>(null);

  private readonly branchService = inject(BranchManagementService);

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Thực đơn', url: '/admin/menu/products/list' },
      { label: 'Khả dụng CN', url: '/admin/menu/availability/list' },
    ]);
    this.loadBranches();
  }

  // ── Load data ──

  loadBranches(): void {
    this.branchService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => this.branches.set(list ?? []),
        error: () => this.toastService.error('Không thể tải danh sách chi nhánh'),
      });
  }

  selectBranch(branch: Branch): void {
    this.selectedBranch.set(branch);
    this.selectedSection.set(null);
  }

  openSection(section: 'product' | 'topping' | null): void {
    this.selectedSection.set(section);
  }
}
