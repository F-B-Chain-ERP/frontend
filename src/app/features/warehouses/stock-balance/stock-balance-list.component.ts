import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { StockBalanceService } from './stock-balance.service';
import { StockBalance, StockBalanceFilter, getStockBalanceMeta } from './stock-balance.model';
import { WarehouseService } from '../warehouse-list/warehouse.service';
import { Warehouse } from '../warehouse-list/warehouse.model';
import { WarehouseMaterialService } from '../materials/material.service';
import { Material } from '../materials/material.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-stock-balance-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    NzGridModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
  ],
  templateUrl: './stock-balance-list.component.html',
  styleUrls: ['./stock-balance-list.component.scss'],
})
export class StockBalanceListComponent extends BaseComponent implements OnInit {
  readonly getStockBalanceMeta = getStockBalanceMeta;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  readonly balances = signal<StockBalance[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  warehouses: Warehouse[] = [];
  materials: Material[] = [];

  selectedWarehouseId: string | null = null;
  selectedMaterialId: string | null = null;
  searchQuery = '';
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  private readonly stockBalanceService = inject(StockBalanceService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly materialService = inject(WarehouseMaterialService);

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Kho & Cung ứng', url: '/admin/inventory/warehouses/list' },
      { label: 'Tồn kho', url: '/admin/inventory/balances/list' },
    ]);
    this.loadWarehouses();
    this.loadMaterials();
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const filter: StockBalanceFilter = {
      warehouseId: this.selectedWarehouseId,
      materialId: this.selectedMaterialId,
      query: this.searchQuery,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };
    this.stockBalanceService
      .getBalances(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.balances.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải tồn kho.');
        },
      });
  }

  onFilterChange(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onResetFilters(): void {
    this.selectedWarehouseId = null;
    this.selectedMaterialId = null;
    this.searchQuery = '';
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

  private loadWarehouses(): void {
    this.warehouseService
      .getAllWarehouses('ACTIVE')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          this.warehouses = list;
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách kho.'),
      });
  }

  private loadMaterials(): void {
    this.materialService
      .getMaterials({ status: 'ACTIVE', pageIndex: 1, pageSize: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.materials = res.items;
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách nguyên vật liệu.'),
      });
  }
}
