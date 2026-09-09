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
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { ProductService } from './product.service';
import { CategoryService } from '../categories/category.service';
import { Category } from '../categories/category.model';
import {
  Product,
  ProductDetail,
  ProductVariant,
  PRODUCT_STATUS_OPTIONS,
  getProductStatusMeta,
  CreateProductFormData,
} from './product.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-product-list',
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
    NzTagModule,
    NzInputNumberModule,
    NzSwitchModule,
    NzSpinModule,
    NzDividerModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly getProductStatusMeta = getProductStatusMeta;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly statusOptions = PRODUCT_STATUS_OPTIONS;

  readonly booleanFilterOptions = [
    { label: 'Tất cả', value: null },
    { label: 'Có', value: true },
    { label: 'Không', value: false },
  ];

  readonly currencyFormatter = (value: number | string): string =>
    value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';

  // ── State signals ───────────────────────────────────────────────────
  readonly products = signal<Product[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly categories = signal<Category[]>([]);
  readonly selectedProduct = signal<ProductDetail | null>(null);
  readonly isDetailModalVisible = signal(false);
  readonly loadingDetail = signal(false);

  // ── Form Modal state (dùng chung cho Tạo mới & Chỉnh sửa) ───────────
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly editingProductId = signal<string | null>(null);
  readonly isCreateModalVisible = signal(false);
  readonly isSubmitting = signal(false);
  readonly selectedImageFile = signal<File | null>(null);
  readonly imagePreviewUrl = signal<string | null>(null);
  readonly imageInputMode = signal<'file' | 'url'>('file');

  // ── Filter inputs ───────────────────────────────────────────────────
  searchQuery = '';
  selectedCategoryId: string | null = null;
  selectedStatus: string | null = null;
  selectedFeatured: boolean | null = null;
  selectedBestSeller: boolean | null = null;
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;

  // ── Form tạo / chỉnh sửa sản phẩm ──────────────────────────────────
  readonly createForm = this.fb.group({
    categoryId: this.fb.control<string | null>(null, [Validators.required]),
    code: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(/^[A-Za-z0-9_-]+$/),
    ]),
    name: this.fb.control<string | null>(null, [Validators.required, Validators.maxLength(150)]),
    description: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
    imageUrl: this.fb.control<string | null>(null, [Validators.maxLength(1000)]),
    basePrice: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    preparationMinutes: this.fb.control<number | null>(10, [Validators.min(0)]),
    isFeatured: this.fb.control<boolean>(false),
    isBestSeller: this.fb.control<boolean>(false),
    isCombo: this.fb.control<boolean>(false),
    status: this.fb.control<string>('ACTIVE'),
  });

  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Thực đơn', url: '/admin/menu/products/list' },
      { label: 'Sản phẩm', url: '/admin/menu/products/list' },
    ]);
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    this.categoryService
      .getCategories({ pageIndex: 1, pageSize: 100, status: 'ACTIVE' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => this.categories.set(res.items || []),
        error: err => {
          console.error('Không thể tải danh sách danh mục:', err);
          this.categories.set([]);
        },
      });
  }

  loadProducts(): void {
    this.loading.set(true);
    this.productService
      .getProducts({
        query: this.searchQuery,
        categoryId: this.selectedCategoryId,
        status: this.selectedStatus,
        isFeatured: this.selectedFeatured,
        isBestSeller: this.selectedBestSeller,
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.products.set(res.items || []);
          this.total.set(res.total || 0);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toastService.error(err.message || 'Không thể tải danh sách sản phẩm');
        },
      });
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadProducts();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryId = null;
    this.selectedStatus = null;
    this.selectedFeatured = null;
    this.selectedBestSeller = null;
    this.pageIndex = 1;
    this.loadProducts();
  }

  onPageIndexChange(page: number): void {
    this.pageIndex = page;
    this.loadProducts();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
    this.loadProducts();
  }

  // ── Detail Modal ────────────────────────────────────────────────────
  openDetailModal(item: Product): void {
    this.selectedProduct.set(null);
    this.isDetailModalVisible.set(true);
    this.loadingDetail.set(true);
    this.productService
      .getProduct(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          this.selectedProduct.set(detail);
          this.loadingDetail.set(false);
        },
        error: err => {
          this.loadingDetail.set(false);
          this.toastService.error(err.message || 'Không thể tải chi tiết sản phẩm');
        },
      });
  }

  closeDetailModal(): void {
    this.isDetailModalVisible.set(false);
    this.selectedProduct.set(null);
    this.loadingDetail.set(false);
  }

  editFromDetail(): void {
    const product = this.selectedProduct();
    if (product) {
      this.closeDetailModal();
      this.openEditModal(product);
    }
  }

  parseLevels(levelsStr?: string | null): string[] {
    if (!levelsStr) return [];
    return levelsStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  // ── Create Modal ────────────────────────────────────────────────────
  openCreateModal(): void {
    this.modalMode.set('create');
    this.editingProductId.set(null);
    this.createForm.reset({
      categoryId: null,
      code: '',
      name: '',
      description: '',
      imageUrl: '',
      basePrice: null,
      preparationMinutes: 10,
      isFeatured: false,
      isBestSeller: false,
      isCombo: false,
      status: 'ACTIVE',
    });
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.imageInputMode.set('file');
    this.isCreateModalVisible.set(true);
  }

  // ── Edit Modal ──────────────────────────────────────────────────────
  openEditModal(item: Product): void {
    this.modalMode.set('edit');
    this.editingProductId.set(item.id);
    this.createForm.reset({
      categoryId: item.categoryId,
      code: item.code,
      name: item.name,
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      basePrice: item.basePrice,
      preparationMinutes: item.preparationMinutes ?? 10,
      isFeatured: !!item.isFeatured,
      isBestSeller: !!item.isBestSeller,
      isCombo: !!item.isCombo,
      status: item.status ?? 'ACTIVE',
    });
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(item.imageUrl ?? null);
    this.imageInputMode.set(item.imageUrl ? 'url' : 'file');
    this.isCreateModalVisible.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalVisible.set(false);
    this.editingProductId.set(null);
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.warning('Dung lượng ảnh tối đa là 5MB');
        return;
      }
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowed.includes(file.type.toLowerCase())) {
        this.toastService.warning('Định dạng ảnh không hỗ trợ (chỉ nhận JPG, PNG, WebP, GIF)');
        return;
      }
      this.selectedImageFile.set(file);
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeSelectedImage(): void {
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.createForm.controls.imageUrl.setValue('');
  }

  submitCreate(): void {
    if (!this.validateAndFocusFirstInvalid(this.createForm)) {
      return;
    }

    const raw = this.createForm.getRawValue();
    this.isSubmitting.set(true);

    const formData: CreateProductFormData = {
      categoryId: raw.categoryId!,
      code: (raw.code || '').trim().toUpperCase(),
      name: (raw.name || '').trim(),
      description: raw.description?.trim() || null,
      imageUrl: raw.imageUrl?.trim() || null,
      basePrice: Number(raw.basePrice),
      preparationMinutes: raw.preparationMinutes != null ? Number(raw.preparationMinutes) : 10,
      isFeatured: !!raw.isFeatured,
      isBestSeller: !!raw.isBestSeller,
      isCombo: !!raw.isCombo,
      status: raw.status || 'ACTIVE',
      image: this.selectedImageFile(),
    };

    if (this.modalMode() === 'edit' && this.editingProductId()) {
      this.productService
        .update(this.editingProductId()!, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: updated => {
            this.isSubmitting.set(false);
            this.toastService.success(`Cập nhật sản phẩm "${updated.name}" thành công!`);
            this.closeCreateModal();
            this.loadProducts();
          },
          error: err => {
            this.isSubmitting.set(false);
            this.toastService.error(err.message || 'Không thể cập nhật sản phẩm');
          },
        });
    } else {
      this.productService
        .create(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: created => {
            this.isSubmitting.set(false);
            this.toastService.success(`Tạo sản phẩm "${created.name}" thành công!`);
            this.closeCreateModal();
            this.loadProducts();
          },
          error: err => {
            this.isSubmitting.set(false);
            this.toastService.error(err.message || 'Không thể tạo sản phẩm');
          },
        });
    }
  }

  // ── Soft Delete ─────────────────────────────────────────────────────
  onDelete(item: Product): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa sản phẩm',
      nzContent: `Bạn có chắc muốn xóa sản phẩm <strong>${item.code} - ${item.name}</strong>? Sản phẩm sẽ được xóa mềm và ngừng hiển thị trên thực đơn bán hàng.`,
      nzOkText: 'Xóa sản phẩm',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.productService
          .delete(item.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success(`Đã xóa sản phẩm "${item.name}" thành công!`);
              this.loadProducts();
            },
            error: err => {
              this.toastService.error(err.message || 'Không thể xóa sản phẩm');
            },
          });
      },
    });
  }
}
