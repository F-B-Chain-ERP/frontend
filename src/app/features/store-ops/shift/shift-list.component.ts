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
import { ShiftMockService } from './shift-mock.service';
import { StoreShiftRecord } from './shift.model';

@Component({
  selector: 'app-shift-list',
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
  templateUrl: './shift-list.component.html',
  styleUrls: ['./shift-list.component.scss'],
})
export class ShiftListComponent implements OnInit {
  private readonly shiftService = inject(ShiftMockService);
  private readonly toast = inject(AppNotificationService);

  shifts = signal<StoreShiftRecord[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = '';

  // Pagination
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  total = computed(() => this.shifts().length);
  pagedData = computed(() => {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.shifts().slice(start, start + this.pageSize);
  });

  isDrawerVisible = signal<boolean>(false);
  selectedShift = signal<StoreShiftRecord | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.shiftService.getShifts(this.searchQuery).subscribe({
      next: (data) => {
        this.shifts.set(data);
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

  onViewShift(shift: StoreShiftRecord): void {
    this.selectedShift.set(shift);
    this.isDrawerVisible.set(true);
  }

  onCloseDrawer(): void {
    this.isDrawerVisible.set(false);
    this.selectedShift.set(null);
  }

  onApproveShift(): void {
    const shift = this.selectedShift();
    if (!shift) return;

    this.shiftService.approveShift(shift.id).subscribe({
      next: (res) => {
        this.toast.success('Duyệt thành công', `Đã ký duyệt chốt ca ${res.shiftCode}`);
        this.selectedShift.set({ ...res });
        this.loadData();
      },
      error: () => this.toast.error('Lỗi', 'Không thể duyệt ca'),
    });
  }
}
