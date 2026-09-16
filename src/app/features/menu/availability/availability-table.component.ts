import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzPopoverModule } from 'ng-zorro-antd/popover';

import { takeUntil } from 'rxjs';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';

import { AvailabilityService } from './availability.service';
import { BranchProductAvailability, BranchToppingAvailability, UpdateAvailabilityRequest } from './availability.model';
import { CategoryService } from '../categories/category.service';
import { Category } from '../categories/category.model';

// ── Unified row dùng chung cho cả product & topping ──
interface AvailabilityRow {
  id: string;
  code: string;
  name: string;
  group: string;
  price: number;
  customPrice: number | null;
  isAvailable: boolean;
  status: string;
}

@Component({
  selector: 'app-availability-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzIconModule,
    NzTagModule,
    NzTooltipModule,
    NzSelectModule,
    NzEmptyModule,
    NzSwitchModule,
    NzInputNumberModule,
    NzPopoverModule,
    AppButtonComponent,
    AppPaginationComponent,
  ],
  templateUrl: './availability-table.component.html',
  styleUrls: ['./availability-table.component.scss'],
})
export class AvailabilityTableComponent extends BaseComponent implements OnInit, OnChanges {
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  @Input({ required: true }) type!: 'product' | 'topping';
  @Input({ required: true }) branchId!: string;

  // ── Data ──
  readonly productData = signal<BranchProductAvailability[]>([]);
  readonly productTotal = signal(0);
  readonly toppingData = signal<BranchToppingAvailability[]>([]);
  readonly toppingTotal = signal(0);

  // ── Categories (chỉ product) ──
  readonly categories = signal<Category[]>([]);

  // ── Filter / Pagination ──
  searchQuery = '';
  selectedCategoryId: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  readonly isLoading = signal(false);

  // ── Sale price editing (keyed by row id = productId/toppingId — luôn unique) ──
  readonly editingPriceId = signal<string | null>(null);
  editingSalePriceValue = 0;
  readonly pricePopoverOpen = signal(false);

  // ── Computed ──
  readonly rows = computed<AvailabilityRow[]>(() => {
    if (this.isProduct) {
      return this.productData().map(p => ({
        id: p.productId,
        code: p.productCode,
        name: p.productName,
        group: p.categoryName,
        price: p.basePrice,
        customPrice: p.salePrice,
        isAvailable: p.isAvailable,
        status: p.status,
      }));
    }
    return this.toppingData().map(t => ({
      id: t.toppingId,
      code: t.toppingCode,
      name: t.toppingName,
      group: t.groupName,
      price: t.toppingPrice,
      customPrice: null,
      isAvailable: t.isAvailable,
      status: t.status,
    }));
  });

  readonly total = computed<number>(() => (this.isProduct ? this.productTotal() : this.toppingTotal()));

  // ── Display derivations (static theo type) ──
  get isProduct(): boolean {
    return this.type === 'product';
  }

  get title(): string {
    return this.isProduct ? 'Sản phẩm khả dụng' : 'Topping khả dụng';
  }

  get codeHeader(): string {
    return this.isProduct ? 'Mã SP' : 'Mã topping';
  }

  get nameHeader(): string {
    return this.isProduct ? 'Tên sản phẩm' : 'Tên topping';
  }

  get groupHeader(): string {
    return this.isProduct ? 'Danh mục' : 'Nhóm';
  }

  get priceHeader(): string {
    return this.isProduct ? 'Giá gốc' : 'Giá';
  }

  get emptyText(): string {
    return this.isProduct ? 'Không có sản phẩm nào' : 'Không có topping nào';
  }

  get scrollX(): string {
    return this.isProduct ? '560px' : '520px';
  }

  private readonly availabilityService = inject(AvailabilityService);
  private readonly categoryService = inject(CategoryService);

  // ── Lifecycle ──

  ngOnInit(): void {
    if (this.isProduct) {
      this.loadCategories();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['branchId']) {
      this.resetState();
      this.load();
    }
  }

  // ── Load data ──

  load(): void {
    if (!this.branchId) return;

    this.isLoading.set(true);
    this.closePriceEdit();

    if (this.isProduct) {
      this.availabilityService
        .listProducts(this.branchId, this.pageIndex - 1, this.pageSize, this.searchQuery, undefined, this.selectedCategoryId ?? undefined)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: res => {
            this.productData.set(res.content ?? []);
            this.productTotal.set(res.totalElements ?? 0);
            this.isLoading.set(false);
          },
          error: () => {
            this.toastService.error('Không thể tải danh sách sản phẩm');
            this.isLoading.set(false);
          },
        });
      return;
    }

    this.availabilityService
      .listToppings(this.branchId, this.pageIndex - 1, this.pageSize, this.searchQuery)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.toppingData.set(res.content ?? []);
          this.toppingTotal.set(res.totalElements ?? 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.toastService.error('Không thể tải danh sách topping');
          this.isLoading.set(false);
        },
      });
  }

  loadCategories(): void {
    this.categoryService
      .getCategories({ pageIndex: 1, pageSize: 100, status: 'ACTIVE' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => this.categories.set(res.items || []),
        error: () => console.error('Lỗi tải danh mục'),
      });
  }

  // ── Filter / Pagination ──

  onSearch(): void {
    this.pageIndex = 1;
    this.load();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryId = null;
    this.pageIndex = 1;
    this.load();
  }

  onPageIndexChange(index: number): void {
    this.pageIndex = index;
    this.load();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
    this.load();
  }

  // ── Toggle availability ──

  toggleAvailability(row: AvailabilityRow, isAvailable: boolean): void {
    if (!this.branchId) return;

    if (this.isProduct) {
      const request: UpdateAvailabilityRequest = {
        isAvailable,
        salePrice: row.customPrice,
      };
      this.availabilityService
        .updateProduct(this.branchId, row.id, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success(isAvailable ? 'Đã bật khả dụng' : 'Đã tắt khả dụng');
            this.load();
          },
          error: err => this.toastService.error(err?.message || 'Lỗi cập nhật'),
        });
      return;
    }

    const request: UpdateAvailabilityRequest = { isAvailable };
    this.availabilityService
      .updateTopping(this.branchId, row.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success(isAvailable ? 'Đã bật khả dụng' : 'Đã tắt khả dụng');
          this.load();
        },
        error: err => this.toastService.error(err?.message || 'Lỗi cập nhật'),
      });
  }

  // ── Sale price editing (chỉ dùng cho product) ──

  startEditSalePrice(row: AvailabilityRow): void {
    this.editingPriceId.set(row.id);
    this.editingSalePriceValue = row.customPrice ?? row.price;
    this.pricePopoverOpen.set(true);
  }

  closePriceEdit(): void {
    this.editingPriceId.set(null);
    this.editingSalePriceValue = 0;
    this.pricePopoverOpen.set(false);
  }

  cancelEditSalePrice(): void {
    this.closePriceEdit();
  }

  isEditingPrice(row: AvailabilityRow): boolean {
    return this.editingPriceId() === row.id;
  }

  editingRow(): AvailabilityRow | null {
    const id = this.editingPriceId();
    if (!id) return null;
    return this.rows().find(r => r.id === id) ?? null;
  }

  onPricePopoverVisibleChange(row: AvailabilityRow, visible: boolean): void {
    if (visible) {
      this.startEditSalePrice(row);
    } else {
      this.closePriceEdit();
    }
  }

  saveSalePrice(row: AvailabilityRow): void {
    if (!this.branchId) return;

    if (this.editingSalePriceValue < 0) {
      this.toastService.warning('Giá bán phải >= 0');
      return;
    }

    const request: UpdateAvailabilityRequest = {
      isAvailable: row.isAvailable,
      salePrice: this.editingSalePriceValue,
    };

    this.availabilityService
      .updateProduct(this.branchId, row.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Đã cập nhật giá');
          this.closePriceEdit();
          this.load();
        },
        error: err => this.toastService.error(err?.message || 'Lỗi cập nhật giá'),
      });
  }

  clearSalePrice(row: AvailabilityRow): void {
    if (!this.branchId) return;

    const request: UpdateAvailabilityRequest = {
      isAvailable: row.isAvailable,
      salePrice: null,
      clearPrice: true,
    };

    this.availabilityService
      .updateProduct(this.branchId, row.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Đã đưa về giá gốc');
          this.closePriceEdit();
          this.load();
        },
        error: err => this.toastService.error(err?.message || 'Lỗi cập nhật giá'),
      });
  }

  // ── Helpers ──

  formatCurrency(value: number | null): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  private resetState(): void {
    this.searchQuery = '';
    this.selectedCategoryId = null;
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.productData.set([]);
    this.productTotal.set(0);
    this.toppingData.set([]);
    this.toppingTotal.set(0);
    this.isLoading.set(false);
    this.closePriceEdit();
  }
}
