import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from '../../../shared/constants/constant';

import { BomService } from './bom.service';
import {
  BulkSyncBomRequest,
  ProductBomOverview,
} from './bom.model';
import { WarehouseMaterialService } from '../../warehouses/materials/material.service';
import { UnitService } from '../units/unit.service';
import { CategoryService } from '../categories/category.service';
import { Category } from '../categories/category.model';
import { takeUntil } from 'rxjs';

export interface EditableRecipeRow {
  id?: string | null;
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number | null;
  unitId: string;
  unitCode: string;
  wastagePercent: number;
  isDeleting?: boolean;
}

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
    NzTooltipModule,
    NzGridModule,
    NzSelectModule,
    NzSpinModule,
    NzPopconfirmModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './bom-list.component.html',
  styleUrls: ['./bom-list.component.scss'],
})
export class BomListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;

  private readonly bomService = inject(BomService);
  private readonly materialService = inject(WarehouseMaterialService);
  private readonly unitService = inject(UnitService);
  private readonly categoryService = inject(CategoryService);

  // Danh sách biến thể & BOM
  readonly bomList = signal<ProductBomOverview[]>([]);
  readonly materials = signal<any[]>([]);
  readonly units = signal<any[]>([]);
  readonly categories = signal<Category[]>([]);

  readonly isLoading = signal<boolean>(false);
  readonly isModalLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  // Bộ lọc
  searchQuery = '';
  selectedCategoryId: string | null = null;
  selectedBomStatus = ''; // '' (Tất cả), 'HAS_BOM', 'NO_BOM'

  // Phân trang
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // Lọc dữ liệu hiển thị phía client
  readonly filteredList = computed(() => {
    let result = this.bomList();
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          item.productCode?.toLowerCase().includes(q) ||
          item.productName?.toLowerCase().includes(q) ||
          item.variantName?.toLowerCase().includes(q) ||
          item.categoryName?.toLowerCase().includes(q)
      );
    }
    if (this.selectedCategoryId) {
      const cat = this.categories().find((c) => c.id === this.selectedCategoryId);
      if (cat) {
        result = result.filter((item) => item.categoryName === cat.name);
      }
    }
    if (this.selectedBomStatus === 'HAS_BOM') {
      result = result.filter((item) => item.itemCount > 0);
    } else if (this.selectedBomStatus === 'NO_BOM') {
      result = result.filter((item) => item.itemCount === 0);
    }
    return result;
  });

  readonly total = computed(() => this.filteredList().length);
  readonly pagedData = computed(() => {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.filteredList().slice(start, start + this.pageSize);
  });

  // Modal cấu hình BOM
  readonly isModalVisible = signal<boolean>(false);
  readonly selectedOverview = signal<ProductBomOverview | null>(null);
  readonly editingRows = signal<EditableRecipeRow[]>([]);

  get modalTitle(): string {
    const item = this.selectedOverview();
    if (!item) return 'Cấu hình công thức định lượng (BOM)';
    return `Cấu hình công thức định lượng (BOM) — ${item.productName} (${item.variantName})`;
  }

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Thực đơn', url: '/admin/menu/products/list' },
      { label: 'Định lượng (BOM)', url: '/admin/menu/bom/list' },
    ]);

    this.loadData();
    this.loadMetadata();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.bomService
      .getBomOverview(this.searchQuery)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.bomList.set(data || []);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Không thể tải danh sách định lượng công thức');
          this.isLoading.set(false);
        },
      });
  }

  loadMetadata(): void {
    // Tải nguyên vật liệu (pageSize: 100 đúng chuẩn backend)
    this.materialService
      .getMaterials({ pageIndex: 1, pageSize: 100, status: 'ACTIVE' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.materials.set(res.items || []),
        error: (err) => console.error('Lỗi tải danh mục nguyên vật liệu:', err),
      });

    // Tải đơn vị tính
    this.unitService
      .getUnits({ pageIndex: 1, pageSize: 100, status: 'ACTIVE' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.units.set(res.items || []),
        error: (err) => console.error('Lỗi tải danh mục đơn vị tính:', err),
      });

    // Tải danh mục thực đơn (để lọc theo danh mục)
    this.categoryService
      .getCategories({ pageIndex: 1, pageSize: 100, status: 'ACTIVE' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.categories.set(res.items || []),
        error: (err) => console.error('Lỗi tải danh mục sản phẩm:', err),
      });
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryId = null;
    this.selectedBomStatus = '';
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

  openRecipeModal(item: ProductBomOverview): void {
    this.selectedOverview.set(item);
    this.isModalVisible.set(true);
    this.isModalLoading.set(true);
    this.editingRows.set([]);

    this.bomService
      .getBom(item.variantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bom) => {
          const rows: EditableRecipeRow[] = (bom.items || []).map((it) => ({
            id: it.id,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            quantity: it.quantity,
            unitId: it.unitId,
            unitCode: it.unitCode,
            wastagePercent: it.wastagePercent || 0,
          }));
          this.editingRows.set(rows);
          this.isModalLoading.set(false);
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Không thể tải chi tiết công thức định lượng');
          this.isModalLoading.set(false);
        },
      });
  }

  closeModal(): void {
    this.isModalVisible.set(false);
    this.selectedOverview.set(null);
    this.editingRows.set([]);
  }

  addRecipeRow(): void {
    const current = this.editingRows();
    const newRow: EditableRecipeRow = {
      id: null,
      materialId: '',
      materialCode: '',
      materialName: '',
      quantity: null,
      unitId: '',
      unitCode: '',
      wastagePercent: 0,
    };
    this.editingRows.set([...current, newRow]);
  }

  /**
   * Xác nhận và xóa dòng công thức:
   * - Nếu dòng đã tồn tại trên DB (có id): hiện dialog xác nhận modalService.confirm rồi xóa mềm.
   * - Nếu dòng vừa thêm local (chưa có id): xóa ngay khỏi mảng local.
   */
  confirmRemoveRow(index: number): void {
    const row = this.editingRows()[index];
    if (!row) return;

    if (row.id) {
      const matName = row.materialName || row.materialCode || 'nguyên vật liệu này';
      this.modalService.confirm({
        nzTitle: 'Xác nhận gỡ nguyên vật liệu',
        nzContent: `Bạn có chắc muốn gỡ nguyên vật liệu <strong>${matName}</strong> khỏi công thức định lượng? Dòng này sẽ được xóa mềm và không còn trừ kho khi bán hàng.`,
        nzOkText: 'Xác nhận gỡ',
        nzOkDanger: true,
        nzCancelText: 'Hủy',
        nzOnOk: () => this.removeRecipeRow(index),
      });
    } else {
      this.removeRecipeRow(index);
    }
  }

  removeRecipeRow(index: number): void {
    const rows = [...this.editingRows()];
    const row = rows[index];
    const overview = this.selectedOverview();

    if (!row) return;

    if (row.id && overview) {
      // Dòng đã có trên DB: gọi API removeItem
      row.isDeleting = true;
      this.bomService
        .removeItem(overview.variantId, row.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success('Đã gỡ nguyên vật liệu khỏi công thức');
            rows.splice(index, 1);
            this.editingRows.set(rows);
            this.loadData();
          },
          error: (err) => {
            row.isDeleting = false;
            this.toastService.error(err?.error?.message || 'Không thể gỡ nguyên vật liệu');
          },
        });
    } else {
      // Dòng vừa tạo mới ở local
      rows.splice(index, 1);
      this.editingRows.set(rows);
    }
  }

  onMaterialChange(row: EditableRecipeRow, materialId: string): void {
    row.materialId = materialId;
    if (!materialId) {
      row.materialCode = '';
      row.materialName = '';
      row.unitId = '';
      row.unitCode = '';
      return;
    }

    const mat = this.materials().find((m) => m.id === materialId);
    if (mat) {
      row.materialCode = mat.code || '';
      row.materialName = mat.name || '';
      if (mat.baseUnitId) {
        row.unitId = mat.baseUnitId;
        const u = this.units().find((unit) => unit.id === mat.baseUnitId);
        row.unitCode = u ? u.code : mat.baseUnitCode || '';
      }
    }
  }

  onUnitChange(row: EditableRecipeRow, unitId: string): void {
    row.unitId = unitId;
    const u = this.units().find((unit) => unit.id === unitId);
    row.unitCode = u ? u.code : '';
  }

  onSaveRecipe(): void {
    const overview = this.selectedOverview();
    if (!overview) return;

    const rows = this.editingRows();

    // Validate dữ liệu các dòng
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.materialId) {
        this.toastService.warning(`Dòng ${i + 1}: Vui lòng chọn nguyên vật liệu`);
        return;
      }
      if (!r.quantity || r.quantity <= 0) {
        this.toastService.warning(`Dòng ${i + 1}: Định lượng tiêu hao phải lớn hơn 0`);
        return;
      }
      if (!r.unitId) {
        this.toastService.warning(`Dòng ${i + 1}: Vui lòng chọn đơn vị tính`);
        return;
      }
    }

    // Kiểm tra trùng lặp nguyên liệu
    const seenMat = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      if (seenMat.has(rows[i].materialId)) {
        this.toastService.warning(`Nguyên vật liệu "${rows[i].materialName}" bị chọn trùng lặp`);
        return;
      }
      seenMat.add(rows[i].materialId);
    }

    const payload: BulkSyncBomRequest = {
      items: rows.map((r) => ({
        id: r.id || null,
        materialId: r.materialId,
        quantity: Number(r.quantity),
        unitId: r.unitId,
        wastagePercent: Number(r.wastagePercent || 0),
      })),
    };

    this.isSaving.set(true);
    this.bomService
      .syncBom(overview.variantId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success(
            `Đã lưu công thức định lượng cho ${overview.productName} (${overview.variantName})`
          );
          this.isSaving.set(false);
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message || 'Không thể lưu công thức định lượng';
          this.toastService.error(msg);
        },
      });
  }
}
