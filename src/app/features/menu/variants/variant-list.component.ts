import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {takeUntil} from 'rxjs';

import {NzTableModule} from 'ng-zorro-antd/table';
import {NzCardModule} from 'ng-zorro-antd/card';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzInputNumberModule} from 'ng-zorro-antd/input-number';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzTooltipModule} from 'ng-zorro-antd/tooltip';
import {NzGridModule} from 'ng-zorro-antd/grid';
import {NzTagModule} from 'ng-zorro-antd/tag';
import {NzSpinModule} from 'ng-zorro-antd/spin';
import {NzEmptyModule} from 'ng-zorro-antd/empty';
import {NzBadgeModule} from 'ng-zorro-antd/badge';

import {BaseComponent} from '../../../shared/base-component/base.component';
import {AppBreadcrumbsComponent} from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import {AppButtonComponent} from '../../../shared/app-button/app-button.component';
import {AppModalComponent} from '../../../shared/app-modal/app-modal.component';
import {HasSomeAuthorityDirective} from '../../../core/auth/has-some-authority.directive';
import {ROLE} from '../../../core/config/functions.constants';

import {ProductService} from '../products/product.service';
import {Product, getProductStatusMeta} from '../products/product.model';
import {ProductVariantService} from '../products/variants/variant.service';
import {
  CreateProductVariantRequest,
  ProductVariant,
  STANDARD_BEVERAGE_SIZE_PRESETS,
  SyncProductVariantItem,
  UpdateProductVariantRequest,
  VariantPreset,
} from '../products/variants/variant.model';
import {CategoryService} from '../categories/category.service';
import {Category} from '../categories/category.model';

@Component({
  selector: 'app-variant-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzCardModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzIconModule,
    NzTooltipModule,
    NzGridModule,
    NzTagModule,
    NzSpinModule,
    NzEmptyModule,
    NzBadgeModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './variant-list.component.html',
  styleUrls: ['./variant-list.component.scss'],
})
export class VariantListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly getProductStatusMeta = getProductStatusMeta;
  readonly standardSizePresets = STANDARD_BEVERAGE_SIZE_PRESETS;

  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly variantService = inject(ProductVariantService);
  private readonly categoryService = inject(CategoryService);

  // ── States ──────────────────────────────────────────────────────────
  readonly loadingProducts = signal(false);
  readonly loadingVariants = signal(false);
  readonly isSavingVariant = signal(false);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly selectedProduct = signal<Product | null>(null);
  readonly variants = signal<ProductVariant[]>([]);

  // ── Filters & Search ────────────────────────────────────────────────
  selectedCategoryId: string | null = null;
  productSearchText: string = '';
  variantFilterQuery: string = '';
  selectedVariantStatus: string | null = null;

  // ── Computed Statistics ─────────────────────────────────────────────
  readonly totalVariantsCount = computed(() => this.variants().length);

  readonly activeVariantsCount = computed(
    () => this.variants().filter(v => (v.status || 'ACTIVE') === 'ACTIVE').length,
  );

  readonly basePrice = computed(() => this.selectedProduct()?.basePrice ?? 0);

  readonly minPrice = computed(() => {
    const prod = this.selectedProduct();
    if (!prod) return 0;
    const vars = this.variants().filter(v => (v.status || 'ACTIVE') === 'ACTIVE');
    if (vars.length === 0) return prod.basePrice;
    const minDelta = Math.min(...vars.map(v => v.priceDelta));
    return Math.max(0, prod.basePrice + minDelta);
  });

  readonly maxPrice = computed(() => {
    const prod = this.selectedProduct();
    if (!prod) return 0;
    const vars = this.variants().filter(v => (v.status || 'ACTIVE') === 'ACTIVE');
    if (vars.length === 0) return prod.basePrice;
    const maxDelta = Math.max(...vars.map(v => v.priceDelta));
    return Math.max(0, prod.basePrice + maxDelta);
  });

  readonly filteredVariants = computed(() => {
    let list = this.variants();
    const query = this.variantFilterQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        v =>
          v.variantCode.toLowerCase().includes(query) ||
          v.variantName.toLowerCase().includes(query) ||
          v.sizeLabel.toLowerCase().includes(query),
      );
    }
    if (this.selectedVariantStatus) {
      list = list.filter(v => (v.status || 'ACTIVE') === this.selectedVariantStatus);
    }
    return list;
  });

  readonly filteredProducts = computed(() => {
    let prods = this.products();
    if (this.selectedCategoryId) {
      prods = prods.filter(p => p.categoryId === this.selectedCategoryId);
    }
    const search = this.productSearchText.trim().toLowerCase();
    if (search) {
      prods = prods.filter(
        p => p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search),
      );
    }
    return prods;
  });

  // ── Modals ──────────────────────────────────────────────────────────
  readonly isFormModalVisible = signal(false);
  readonly modalMode = signal<'add' | 'edit'>('add');
  readonly editingVariant = signal<ProductVariant | null>(null);

  readonly isPresetModalVisible = signal(false);

  // ── Form ────────────────────────────────────────────────────────────
  readonly variantForm = this.fb.group({
    variantCode: this.fb.control<string>('', [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(/^[A-Za-z0-9_-]+$/),
    ]),
    variantName: this.fb.control<string>('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    sizeLabel: this.fb.control<string>('', [
      Validators.required,
      Validators.maxLength(30),
    ]),
    priceDelta: this.fb.control<number>(0, [
      Validators.required,
    ]),
    displayOrder: this.fb.control<number>(1, [
      Validators.min(0),
    ]),
    status: this.fb.control<string>('ACTIVE'),
  });

  readonly currencyFormatter = (value: number | string): string =>
    value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';

  ngOnInit(): void {
    this.breadcrumbsService.set([
      {label: 'Trang chủ', url: '/admin/home', icon: 'home'},
      {label: 'Thực đơn', url: '/admin/menu/products/list'},
      {label: 'Biến thể', url: '/admin/menu/variants/list'},
    ]);
    this.loadCategories();
    this.loadProducts();
  }

  // ── Data Loading ────────────────────────────────────────────────────
  private loadCategories(): void {
    this.categoryService
      .getCategories({pageIndex: 1, pageSize: 100, status: 'ACTIVE'})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.categories.set(res.items || []);
        },
        error: () => {
        },
      });
  }

  loadProducts(targetProductId?: string): void {
    this.loadingProducts.set(true);
    this.productService
      .getProducts({pageIndex: 1, pageSize: 200})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          const list = res.items || [];
          this.products.set(list);
          this.loadingProducts.set(false);

          // Handle query param or preselect target
          const queryId = targetProductId || this.route.snapshot.queryParamMap.get('productId');
          if (queryId) {
            const found = list.find(p => p.id === queryId);
            if (found) {
              this.onSelectProduct(found);
              return;
            }
          }

          // Default: Select first product if none selected
          if (!this.selectedProduct() && list.length > 0) {
            this.onSelectProduct(list[0]);
          }
        },
        error: err => {
          this.loadingProducts.set(false);
          this.toastService.error(err.message || 'Không thể tải danh sách sản phẩm');
        },
      });
  }

  onSelectProduct(product: Product): void {
    this.selectedProduct.set(product);
    this.loadVariants(product.id);
  }

  loadVariants(productId: string): void {
    this.loadingVariants.set(true);
    this.variantService
      .getVariants(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          this.variants.set(list || []);
          this.loadingVariants.set(false);
        },
        error: err => {
          this.loadingVariants.set(false);
          this.toastService.error(err.message || 'Không thể tải danh sách biến thể');
        },
      });
  }

  // ── Actions: Add / Edit Variant ─────────────────────────────────────
  openAddModal(): void {
    const prod = this.selectedProduct();
    if (!prod) {
      this.toastService.warning('Vui lòng chọn một sản phẩm trước');
      return;
    }

    this.modalMode.set('add');
    this.editingVariant.set(null);

    const nextOrder = this.variants().length + 1;
    this.variantForm.reset({
      variantCode: '',
      variantName: '',
      sizeLabel: '',
      priceDelta: 0,
      displayOrder: nextOrder,
      status: 'ACTIVE',
    });

    this.isFormModalVisible.set(true);
  }

  openEditModal(variant: ProductVariant): void {
    this.modalMode.set('edit');
    this.editingVariant.set(variant);

    this.variantForm.patchValue({
      variantCode: variant.variantCode,
      variantName: variant.variantName,
      sizeLabel: variant.sizeLabel,
      priceDelta: variant.priceDelta,
      displayOrder: variant.displayOrder,
      status: variant.status || 'ACTIVE',
    });

    this.isFormModalVisible.set(true);
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
    this.editingVariant.set(null);
  }

  onSubmitForm(): void {
    const prod = this.selectedProduct();
    if (!prod) return;

    if (!this.validateAndFocusFirstInvalid(this.variantForm)) {
      return;
    }

    const val = this.variantForm.value;
    const variantCode = (val.variantCode || '').trim().toUpperCase();
    const variantName = (val.variantName || '').trim();
    const sizeLabel = (val.sizeLabel || '').trim();
    const priceDelta = Number(val.priceDelta) || 0;
    const displayOrder = Number(val.displayOrder) || 0;
    const status = val.status || 'ACTIVE';

    this.isSavingVariant.set(true);

    if (this.modalMode() === 'add') {
      const payload: CreateProductVariantRequest = {
        variantCode,
        variantName,
        sizeLabel,
        priceDelta,
        displayOrder,
      };

      this.variantService
        .createVariant(prod.id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSavingVariant.set(false);
            this.toastService.success('Thêm biến thể thành công');
            this.closeFormModal();
            this.loadVariants(prod.id);
          },
          error: err => {
            this.isSavingVariant.set(false);
            this.toastService.error(err.message || 'Không thể thêm biến thể');
          },
        });
    } else {
      const current = this.editingVariant();
      if (!current) return;

      const payload: UpdateProductVariantRequest = {
        variantCode,
        variantName,
        sizeLabel,
        priceDelta,
        displayOrder,
        status,
      };

      this.variantService
        .updateVariant(prod.id, current.id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSavingVariant.set(false);
            this.toastService.success('Cập nhật biến thể thành công');
            this.closeFormModal();
            this.loadVariants(prod.id);
          },
          error: err => {
            this.isSavingVariant.set(false);
            this.toastService.error(err.message || 'Không thể cập nhật biến thể');
          },
        });
    }
  }

  // ── Actions: Toggle Variant Status ──────────────────────────────────
  onToggleStatus(variant: ProductVariant): void {
    const prod = this.selectedProduct();
    if (!prod) return;

    const newStatus = (variant.status || 'ACTIVE') === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionText = newStatus === 'ACTIVE' ? 'áp dụng' : 'tạm dừng';

    const payload: UpdateProductVariantRequest = {
      variantCode: variant.variantCode,
      variantName: variant.variantName,
      sizeLabel: variant.sizeLabel,
      priceDelta: variant.priceDelta,
      displayOrder: variant.displayOrder,
      status: newStatus,
    };

    this.variantService
      .updateVariant(prod.id, variant.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success(`Đã chuyển biến thể sang ${actionText}`);
          this.loadVariants(prod.id);
        },
        error: err => {
          this.toastService.error(err.message || `Không thể ${actionText} biến thể`);
        },
      });
  }

  // ── Actions: Delete Variant ─────────────────────────────────────────
  onDeleteVariant(variant: ProductVariant): void {
    const prod = this.selectedProduct();
    if (!prod) return;

    this.modalService.confirm({
      nzTitle: `Xác nhận xóa biến thể "${variant.variantName}"?`,
      nzContent: `Biến thể mã "${variant.variantCode}" (kích cỡ ${variant.sizeLabel}) sẽ bị xóa vĩnh viễn khỏi sản phẩm "${prod.name}". Thao tác không thể hoàn tác.`,
      nzOkText: 'Xóa biến thể',
      nzOkDanger: true,
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        return new Promise<void>((resolve, reject) => {
          this.variantService
            .deleteVariant(prod.id, variant.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.toastService.success('Đã xóa biến thể thành công');
                this.loadVariants(prod.id);
                resolve();
              },
              error: err => {
                this.toastService.error(err.message || 'Không thể xóa biến thể');
                reject();
              },
            });
        });
      },
    });
  }

  // ── Actions: Apply Presets (Sync API) ────────────────────────────────
  openPresetModal(): void {
    const prod = this.selectedProduct();
    if (!prod) {
      this.toastService.warning('Vui lòng chọn một sản phẩm trước');
      return;
    }
    this.isPresetModalVisible.set(true);
  }

  closePresetModal(): void {
    this.isPresetModalVisible.set(false);
  }

  applyPreset(preset: VariantPreset): void {
    const prod = this.selectedProduct();
    if (!prod) return;

    this.modalService.confirm({
      nzTitle: `Áp dụng ${preset.label}?`,
      nzContent: `Toàn bộ danh sách kích cỡ của "${prod.name}" sẽ được cập nhật đồng bộ theo: ${preset.description}. Bạn có chắc chắn muốn áp dụng?`,
      nzOkText: 'Áp dụng ngay',
      nzCancelText: 'Hủy bỏ',
      nzOnOk: () => {
        return new Promise<void>((resolve, reject) => {
          this.loadingVariants.set(true);
          const payload: SyncProductVariantItem[] = preset.items.map(item => ({
            variantCode: item.variantCode,
            variantName: item.variantName,
            sizeLabel: item.sizeLabel,
            priceDelta: item.priceDelta,
            displayOrder: item.displayOrder,
            status: 'ACTIVE',
          }));

          this.variantService
            .syncVariants(prod.id, payload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: updatedList => {
                this.variants.set(updatedList || []);
                this.loadingVariants.set(false);
                this.toastService.success(`Đã áp dụng thành công ${preset.label}`);
                this.closePresetModal();
                resolve();
              },
              error: err => {
                this.loadingVariants.set(false);
                this.toastService.error(err.message || 'Không thể đồng bộ danh sách kích cỡ');
                reject();
              },
            });
        });
      },
    });
  }

  // ── Quick Helpers ───────────────────────────────────────────────────
  onCategoryFilterChange(catId: string | null): void {
    this.selectedCategoryId = catId;
    const currentProd = this.selectedProduct();
    if (currentProd && catId && currentProd.categoryId !== catId) {
      const match = this.filteredProducts()[0];
      if (match) {
        this.onSelectProduct(match);
      }
    }
  }

  navigateToProduct(productId: string): void {
    this.router.navigate(['/admin/menu/products'], {queryParams: {productId}});
  }

  refreshCurrentVariants(): void {
    const prod = this.selectedProduct();
    if (prod) {
      this.loadVariants(prod.id);
    }
  }
}

export default VariantListComponent;
