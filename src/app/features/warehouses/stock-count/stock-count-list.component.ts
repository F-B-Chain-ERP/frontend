import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { StockCountMockService } from './stock-count-mock.service';
import { StockCountTicket } from './stock-count.model';

@Component({
  selector: 'app-stock-count-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzIconModule,
    NzTagModule,
    NzDrawerModule,
    NzTooltipModule,
    NzGridModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
  ],
  templateUrl: './stock-count-list.component.html',
  styleUrls: ['./stock-count-list.component.scss'],
})
export class StockCountListComponent implements OnInit {
  private readonly stockService = inject(StockCountMockService);
  private readonly toast = inject(AppNotificationService);

  tickets = signal<StockCountTicket[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = '';

  // Pagination
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  total = computed(() => this.tickets().length);
  pagedData = computed(() => {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.tickets().slice(start, start + this.pageSize);
  });

  // Drawer detail
  isDrawerVisible = signal<boolean>(false);
  selectedTicket = signal<StockCountTicket | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.stockService.getTickets(this.searchQuery).subscribe({
      next: (data) => {
        this.tickets.set(data);
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

  onViewTicket(ticket: StockCountTicket): void {
    this.selectedTicket.set(ticket);
    this.isDrawerVisible.set(true);
  }

  onCloseDrawer(): void {
    this.isDrawerVisible.set(false);
    this.selectedTicket.set(null);
  }

  onApproveTicket(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    this.stockService.approveTicket(ticket.id).subscribe({
      next: (res) => {
        this.toast.success('Duyệt thành công', `Đã phê duyệt biên bản kiểm kê ${res.code}`);
        this.selectedTicket.set({ ...res });
        this.loadData();
      },
      error: () => this.toast.error('Lỗi', 'Không thể duyệt phiếu'),
    });
  }
}
