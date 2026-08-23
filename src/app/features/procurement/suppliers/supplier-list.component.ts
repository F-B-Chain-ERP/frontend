import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { SupplierService } from './supplier.service';
import { Supplier, SupplierFilter, SupplierStatus, SUPPLIER_STATUS_OPTIONS, getSupplierStatusMeta } from './supplier.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    NzTooltipModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
  ],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss'],
})
export class SupplierListComponent extends BaseComponent implements OnInit {
  readonly SupplierStatus = SupplierStatus;
  readonly statusOptions = SUPPLIER_STATUS_OPTIONS;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // State signals
  readonly suppliers = signal<Supplier[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  // Filter params
  searchQuery = '';
  selectedStatus: SupplierStatus | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  private readonly supplierService = inject(SupplierService);

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Mua hàng', url: '/admin/procurement/suppliers/list' },
      { label: 'Nhà cung cấp', url: '/admin/procurement/suppliers/list' },
    ]);

    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const filter: SupplierFilter = {
      query: this.searchQuery,
      status: this.selectedStatus,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };

    this.supplierService
      .getSuppliers(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.suppliers.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách nhà cung cấp.');
        },
      });
  }

  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = null;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
    this.toastService.info('Đã đặt lại bộ lọc');
  }

  onPageIndexChange(page: number): void {
    this.pageIndex = page;
    this.loadData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  /**
   * TODO(S2-10): thay bằng mở modal thêm mới / sửa NCC khi làm form
   */
  openFormPlaceholder(mode: 'create' | 'edit'): void {
    const action = mode === 'create' ? 'Thêm mới' : 'Cập nhật';
    this.toastService.info('Đang phát triển', `Chức năng ${action.toLowerCase()} nhà cung cấp sẽ được phát triển ở task S2-10.`);
  }

  getStatusMeta(status: SupplierStatus): ReturnType<typeof getSupplierStatusMeta> {
    return getSupplierStatusMeta(status);
  }
}
