import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AvailabilityTableComponent } from './availability-table.component';
import { BranchService } from '../../../core/auth/branch.service';

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzTabsModule,
    AppBreadcrumbsComponent,
    AvailabilityTableComponent,
  ],
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.scss'],
})
export class AvailabilityComponent extends BaseComponent implements OnInit {
  readonly branchService = inject(BranchService);

  // ── Filter / Tab State ──
  readonly selectedBranchId = signal<string | null>(null);
  readonly activeTab = signal<'product' | 'topping'>('product');

  readonly selectedBranchName = computed(() => {
    const id = this.selectedBranchId();
    const b = this.branchService.branches().find(b => b.id === id);
    return b?.name ?? '';
  });

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Thực đơn', url: '/admin/menu/products/list' },
      { label: 'Khả dụng CN', url: '/admin/menu/availability/list' },
    ]);
    this.autoSelectBranch();
  }

  // ── Branch ──

  private autoSelectBranch(): void {
    const branches = this.branchService.branches();
    if (branches.length > 0 && !this.selectedBranchId()) {
      this.selectedBranchId.set(branches[0].id);
    }
  }

  onBranchChange(branchId: string): void {
    this.selectedBranchId.set(branchId);
  }

  // ── Tab ──

  onTabChange(index: number): void {
    this.activeTab.set(index === 0 ? 'product' : 'topping');
  }
}
