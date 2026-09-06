import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { CategoryService } from './category.service';
import {
  Category,
  CategoryFilter,
  CATEGORY_STATUS_OPTIONS,
  CATEGORY_TYPE_OPTIONS,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  getCategoryStatusMeta,
  getCategoryTypeLabel,
} from './category.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    NzTooltipModule,
    NzGridModule,
    NzInputNumberModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss'],
})
export class CategoryListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly getCategoryStatusMeta = getCategoryStatusMeta;
  readonly getCategoryTypeLabel = getCategoryTypeLabel;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly categoryTypeOptions = CATEGORY_TYPE_OPTIONS;
  readonly statusOptions = CATEGORY_STATUS_OPTIONS;

  // ── State signals ───────────────────────────────────────────────────
  readonly categories = signal<Category[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly isSaving = signal(false);

  searchQuery = '';
  selectedCategoryType: string | null = null;
  selectedStatus: string | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // ── Modals ──────────────────────────────────────────────────────────
  readonly isFormModalVisible = signal(false);
  readonly modalMode = signal<'add' | 'edit'>('add');
  selectedRecord: Category | null = null;

  // ── Form ────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    categoryType: this.fb.control<string | null>(null, [Validators.required]),
    code: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(/^[A-Z0-9_-]+$/),
    ]),
    name: this.fb.control<string | null>(null, [Validators.required, Validators.maxLength(150)]),
    description: this.fb.control<string | null>(null, [Validators.maxLength(255)]),
    imageUrl: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
    displayOrder: this.fb.control<number | null>(0, [Validators.min(0)]),
  });

  private readonly categoryService = inject(CategoryService);

  // ── Lifecycle ───────────────────────────────────────────────────────
  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Thực đơn', url: '/admin/menu/products/list' },
      { label: 'Danh mục', url: '/admin/menu/categories/list' },
    ]);
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const filter: CategoryFilter = {
      query: this.searchQuery,
      categoryType: this.selectedCategoryType,
      status: this.selectedStatus,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };
    this.categoryService
      .getCategories(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.categories.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách danh mục.');
        },
      });
  }

  // ── Filter / Pagination ─────────────────────────────────────────────
  onSearch(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.loadData();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryType = null;
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

  // ── Modal actions ───────────────────────────────────────────────────
  openCreateModal(): void {
    this.modalMode.set('add');
    this.selectedRecord = null;
    this.form.reset({
      categoryType: null,
      code: null,
      name: null,
      description: null,
      imageUrl: null,
      displayOrder: 0,
    });
    this.isFormModalVisible.set(true);
  }

  openEditModal(record: Category): void {
    this.modalMode.set('edit');
    this.selectedRecord = { ...record };
    this.form.reset({
      categoryType: record.categoryType,
      code: record.code,
      name: record.name,
      description: record.description ?? null,
      imageUrl: record.imageUrl ?? null,
      displayOrder: record.displayOrder ?? 0,
    });
    this.isFormModalVisible.set(true);
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
  }

  onSubmitForm(): void {
    if (!this.validateAndFocusFirstInvalid(this.form)) {
      return;
    }
    const raw = this.form.getRawValue();
    const base = {
      categoryType: raw.categoryType as string,
      code: (raw.code || '').trim().toUpperCase(),
      name: (raw.name || '').trim(),
      description: (raw.description || '').trim() || null,
      imageUrl: (raw.imageUrl || '').trim() || null,
      displayOrder: raw.displayOrder != null ? Number(raw.displayOrder) : 0,
    };
    this.isSaving.set(true);

    if (this.modalMode() === 'edit' && this.selectedRecord) {
      // Đổi loại khi đang có con sẽ bị BE chặn (MENU_400_CATEGORY_IN_USE).
      if (this.selectedRecord.categoryType !== base.categoryType) {
        this.modalService.confirm({
          nzTitle: 'Xác nhận đổi loại danh mục',
          nzContent:
            'Đổi loại danh mục khi đang có sản phẩm/nguyên vật liệu sẽ bị từ chối. Bạn có chắc muốn tiếp tục?',
          nzOkText: 'Xác nhận',
          nzCancelText: 'Hủy',
          nzOnOk: () => this.doUpdate(this.selectedRecord!.id, base),
          nzOnCancel: () => this.isSaving.set(false),
        });
        return;
      }
      this.doUpdate(this.selectedRecord.id, base);
    } else {
      const req: CreateCategoryRequest = { ...base };
      this.categoryService
        .create(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.toastService.success('Thành công', 'Đã thêm danh mục.');
            this.closeFormModal();
            this.loadData();
          },
          error: err => {
            this.isSaving.set(false);
            this.toastService.error('Lỗi', err.message || 'Không thể thêm danh mục.');
          },
        });
    }
  }

  private doUpdate(id: string, base: UpdateCategoryRequest): void {
    this.categoryService
      .update(id, base)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastService.success('Thành công', 'Đã cập nhật danh mục.');
          this.closeFormModal();
          this.loadData();
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể cập nhật danh mục.');
        },
      });
  }

  onToggleStatus(record: Category): void {
    const nextStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.categoryService
      .updateStatus(record.id, nextStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success(
            'Thành công',
            nextStatus === 'ACTIVE' ? 'Đã bật sử dụng danh mục.' : 'Đã ngừng sử dụng danh mục.',
          );
          this.loadData();
        },
        error: err => this.toastService.error('Lỗi', err.message || 'Không thể đổi trạng thái danh mục.'),
      });
  }

  onDelete(record: Category): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa danh mục',
      nzContent: `Bạn có chắc muốn xóa danh mục <strong>${record.code} - ${record.name}</strong>? Danh mục còn sản phẩm/nguyên vật liệu sẽ không thể xóa.`,
      nzOkText: 'Xóa danh mục',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.categoryService
          .delete(record.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', 'Đã xóa danh mục.');
              this.loadData();
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể xóa danh mục.'),
          });
      },
    });
  }
}
