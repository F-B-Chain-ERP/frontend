import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { PayableMockService } from './payable-mock.service';
import { AccountsPayableRecord } from './payable.model';

@Component({
  selector: 'app-payable-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzIconModule,
    NzTagModule,
    NzDrawerModule,
    NzModalModule,
    NzTooltipModule,
    NzGridModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
  ],
  templateUrl: './payable-list.component.html',
  styleUrls: ['./payable-list.component.scss'],
})
export class PayableListComponent implements OnInit {
  private readonly payableService = inject(PayableMockService);
  private readonly toast = inject(AppNotificationService);

  payables = signal<AccountsPayableRecord[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = '';

  // Pagination
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  total = computed(() => this.payables().length);
  pagedData = computed(() => {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.payables().slice(start, start + this.pageSize);
  });

  // Detail Drawer
  isDrawerVisible = signal<boolean>(false);
  selectedPayable = signal<AccountsPayableRecord | null>(null);

  // Payment Modal
  isPaymentModalVisible = signal<boolean>(false);
  paymentAmount = 0;
  paymentNote = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.payableService.getPayables(this.searchQuery).subscribe({
      next: (data) => {
        this.payables.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.pageIndex = 1;
    this.loadData();
  }

  onPageIndexChange(index: number): void {
    this.pageIndex = index;
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
  }

  onViewPayable(p: AccountsPayableRecord): void {
    this.selectedPayable.set(p);
    this.isDrawerVisible.set(true);
  }

  onCloseDrawer(): void {
    this.isDrawerVisible.set(false);
    this.selectedPayable.set(null);
  }

  onOpenPaymentModal(): void {
    const p = this.selectedPayable();
    if (!p) return;
    this.paymentAmount = p.remainingAmount;
    this.paymentNote = `Thanh toán công nợ đơn mua hàng ${p.poCode}`;
    this.isPaymentModalVisible.set(true);
  }

  onClosePaymentModal(): void {
    this.isPaymentModalVisible.set(false);
  }

  onConfirmPayment(): void {
    const p = this.selectedPayable();
    if (!p || this.paymentAmount <= 0) return;

    this.payableService.recordPayment(p.id, this.paymentAmount, this.paymentNote).subscribe({
      next: (updated) => {
        this.toast.success('Thành công', `Đã lập ủy nhiệm chi thanh toán ${this.paymentAmount.toLocaleString()} đ`);
        this.selectedPayable.set({ ...updated });
        this.isPaymentModalVisible.set(false);
        this.loadData();
      },
      error: () => this.toast.error('Lỗi', 'Không thể ghi nhận thanh toán'),
    });
  }

  getTotalRemaining(): number {
    return this.payables().reduce((acc, curr) => acc + curr.remainingAmount, 0);
  }

  getTotalOverdue(): number {
    return this.payables()
      .filter(p => p.status === 'OVERDUE')
      .reduce((acc, curr) => acc + curr.remainingAmount, 0);
  }
}
