import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { BomMockService } from './bom-mock.service';
import { ProductBOM, RecipeItem } from './bom.model';

@Component({
  selector: 'app-bom-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzIconModule,
    NzTagModule,
    NzModalModule,
    NzDrawerModule,
    NzTooltipModule,
    NzGridModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
  ],
  templateUrl: './bom-list.component.html',
  styleUrls: ['./bom-list.component.scss'],
})
export class BomListComponent implements OnInit {
  private readonly bomService = inject(BomMockService);
  private readonly toast = inject(AppNotificationService);

  bomList = signal<ProductBOM[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = '';

  // Pagination
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  total = computed(() => this.bomList().length);
  pagedData = computed(() => {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.bomList().slice(start, start + this.pageSize);
  });

  // Drawer detail / edit recipe
  isDrawerVisible = signal<boolean>(false);
  selectedBOM = signal<ProductBOM | null>(null);
  editingItems = signal<RecipeItem[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.bomService.getBOMList({ query: this.searchQuery }).subscribe({
      next: (data) => {
        this.bomList.set(data);
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

  onOpenRecipeDetail(bom: ProductBOM): void {
    this.selectedBOM.set(bom);
    // clone items for editing
    this.editingItems.set(bom.recipeItems.map(item => ({ ...item })));
    this.isDrawerVisible.set(true);
  }

  onCloseDrawer(): void {
    this.isDrawerVisible.set(false);
    this.selectedBOM.set(null);
  }

  onSaveRecipe(): void {
    const bom = this.selectedBOM();
    if (!bom) return;

    this.bomService.updateRecipeItem(bom.id, this.editingItems()).subscribe({
      next: (updated) => {
        this.toast.success('Thành công', `Đã cập nhật định mức công thức cho ${updated.productName}`);
        this.onCloseDrawer();
        this.loadData();
      },
      error: () => this.toast.error('Lỗi', 'Không thể lưu công thức định lượng'),
    });
  }

  calculateCurrentTotalCost(): number {
    return this.editingItems().reduce((acc, curr) => acc + (curr.quantity * curr.unitCost), 0);
  }

  calculateCurrentPercentage(): number {
    const bom = this.selectedBOM();
    if (!bom || bom.sellingPrice === 0) return 0;
    return Math.round((this.calculateCurrentTotalCost() / bom.sellingPrice) * 1000) / 10;
  }
}
