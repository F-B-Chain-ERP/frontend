import {Component, OnInit, computed, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {NzTableModule} from 'ng-zorro-antd/table';
import {NzCardModule} from 'ng-zorro-antd/card';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzTagModule} from 'ng-zorro-antd/tag';
import {NzTooltipModule} from 'ng-zorro-antd/tooltip';
import {NzGridModule} from 'ng-zorro-antd/grid';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzSpinModule} from 'ng-zorro-antd/spin';
import {NzPopconfirmModule} from 'ng-zorro-antd/popconfirm';
import {NzEmptyModule} from 'ng-zorro-antd/empty';
import {NzSwitchModule} from 'ng-zorro-antd/switch';
import {NzInputNumberModule} from 'ng-zorro-antd/input-number';

import {BaseComponent} from '../../../shared/base-component/base.component';
import {AppBreadcrumbsComponent} from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import {AppButtonComponent} from '../../../shared/app-button/app-button.component';
import {AppPaginationComponent} from '../../../shared/app-pagination/app-pagination.component';
import {AppModalComponent} from '../../../shared/app-modal/app-modal.component';
import {HasSomeAuthorityDirective} from '../../../core/auth/has-some-authority.directive';
import {ROLE} from '../../../core/config/functions.constants';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from '../../../shared/constants/constant';

import {ComboService} from './combo.service';
import {
  AddComboItemRequestDto,
  CalculateComboPriceResponseDto,
  Combo,
  ComboDetail,
  ComboItem,
  getComboStatusMeta,
  ProductVariantOption,
} from './combo.model';
import {CategoryService} from '../categories/category.service';
import {Category} from '../categories/category.model';
import {ProductService} from '../products/product.service';
import {Product, UpdateProductRequestDto} from '../products/product.model';
import {takeUntil} from 'rxjs';

@Component({
  selector: 'app-combo-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
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
    NzEmptyModule,
    NzSwitchModule,
    NzInputNumberModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './combo-list.component.html',
  styleUrls: ['./combo-list.component.scss'],
})
export class ComboListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;

  private readonly comboService = inject(ComboService);
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);

  // ── State ──
  readonly combos = signal<Combo[]>([]);
  readonly selectedCombo = signal<Combo | null>(null);
  readonly comboDetail = signal<ComboDetail | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isDetailLoading = signal<boolean>(false);
  readonly isModalLoading = signal<boolean>(false);

  // ── Metadata ──
  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly selectedVariants = signal<any[]>([]);

  // ── Filter ──
  searchQuery = '';
  selectedCategoryId: string | null = null;
  selectedStatus: string | null = null;

  // ── Pagination ──
  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // ── Computed ──
  readonly totalItems = signal(0);
  readonly total = computed(() => this.totalItems());

  readonly pagedData = computed(() => this.combos());

  readonly calculatedPrice = computed(() => {
    const detail = this.comboDetail();
    if (!detail) return 0;
    return detail.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  });

  readonly priceDiff = computed(() => {
    const detail = this.comboDetail();
    if (!detail) return 0;
    return this.editingPriceValue - this.calculatedPrice();
  });

  // ── Add Item Modal ──
  readonly isAddItemModalVisible = signal<boolean>(false);
  addFormItemProductId: string | null = null;
  addFormItemVariantId = '';
  addFormItemQuantity = 1;
  addFormItemIsSubstitutable = false;

  // ── Edit Price ──
  readonly isEditingPrice = signal<boolean>(false);
  readonly isSavingPrice = signal<boolean>(false);
  editingPriceValue: number = 0;

  get addModalTitle(): string {
    const combo = this.selectedCombo();
    return combo ? `Thêm thành phần — ${combo.name}` : 'Thêm thành phần Combo';
  }

  ngOnInit(): void {
    this.breadcrumbsService.set([
      {label: 'Trang chủ', url: '/admin/home', icon: 'home'},
      {label: 'Thực đơn', url: '/admin/menu/products/list'},
      {label: 'Combo', url: '/admin/menu/combos/list'},
    ]);

    this.loadCombos();
    this.loadMetadata();
  }

  loadCombos(): void {
    this.isLoading.set(true);
    this.comboService
      .listCombos({
        query: this.searchQuery,
        categoryId: this.selectedCategoryId,
        status: this.selectedStatus,
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.items?.length === 0 && (res.total || 0) > 0 && this.pageIndex > 1) {
            this.pageIndex--;
            this.loadCombos();
            return;
          }
          this.combos.set(res.items || []);
          this.totalItems.set(res.total || 0);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Không thể tải danh sách combo');
          this.isLoading.set(false);
        },
      });
  }

  loadMetadata(): void {
    this.categoryService
      .getCategories({pageIndex: 1, pageSize: 100, status: 'ACTIVE'})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.categories.set(res.items || []),
        error: (err) => console.error('Lỗi tải danh mục:', err),
      });

    this.productService
      .getProducts({pageIndex: 1, pageSize: 100, status: 'ACTIVE'})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.products.set(res.items || []),
        error: (err) => console.error('Lỗi tải sản phẩm:', err),
      });
  }

  // ── Combo selection ──

  selectCombo(combo: Combo): void {
    this.selectedCombo.set(combo);
    this.loadComboDetail(combo.id);
  }

  clearSelection(): void {
    this.selectedCombo.set(null);
    this.comboDetail.set(null);
  }

  loadComboDetail(comboId: string): void {
    this.isDetailLoading.set(true);
    this.comboService
      .getDetail(comboId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detail) => {
          this.comboDetail.set(detail);
          this.isDetailLoading.set(false);
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Không thể tải chi tiết combo');
          this.isDetailLoading.set(false);
        },
      });
  }

  // ── Filter ──

  onSearch(): void {
    this.pageIndex = 1;
    this.loadCombos();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryId = null;
    this.selectedStatus = null;
    this.pageIndex = 1;
    this.loadCombos();
  }

  onPageIndexChange(index: number): void {
    if (index === this.pageIndex) return;
    this.pageIndex = index;
    this.loadCombos();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    if (this.pageIndex === 1) {
      this.loadCombos();
    } else {
      this.pageIndex = 1;
    }
  }

  // ── Add item ──

  openAddItemModal(): void {
    this.addFormItemProductId = null;
    this.addFormItemVariantId = '';
    this.addFormItemQuantity = 1;
    this.addFormItemIsSubstitutable = false;
    this.selectedVariants.set([]);
    this.isAddItemModalVisible.set(true);
  }

  closeAddItemModal(): void {
    this.isAddItemModalVisible.set(false);
  }

  onProductSelect(productId: string): void {
    this.addFormItemProductId = productId;
    this.addFormItemVariantId = '';
    const product = this.products().find((p) => p.id === productId);
    if (product) {
      this.productService
        .getVariants(productId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (variants) => this.selectedVariants.set(variants || []),
          error: () => this.selectedVariants.set([]),
        });
    }
  }

  confirmAddItem(): void {
    const combo = this.selectedCombo();
    if (!combo) return;

    if (!this.addFormItemVariantId) {
      this.toastService.warning('Vui lòng chọn biến thể');
      return;
    }
    if (!this.addFormItemQuantity || this.addFormItemQuantity < 1) {
      this.toastService.warning('Số lượng phải >= 1');
      return;
    }

    const request: AddComboItemRequestDto = {
      variantId: this.addFormItemVariantId,
      quantity: this.addFormItemQuantity,
      isSubstitutable: this.addFormItemIsSubstitutable,
    };

    this.isModalLoading.set(true);
    this.comboService
      .addItem(combo.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detail) => {
          this.comboDetail.set(detail);
          this.toastService.success('Đã thêm thành phần vào Combo');
          this.isModalLoading.set(false);
          this.closeAddItemModal();
          this.loadCombos();
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Không thể thêm thành phần');
          this.isModalLoading.set(false);
        },
      });
  }

  // ── Remove item ──

  confirmRemoveItem(item: ComboItem): void {
    const combo = this.selectedCombo();
    if (!combo) return;

    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa thành phần',
      nzContent: `Bạn có chắc muốn xóa <strong>${item.productName} (${item.sizeLabel})</strong> khỏi Combo?`,
      nzOkText: 'Xác nhận xóa',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => this.removeItem(item),
    });
  }

  removeItem(item: ComboItem): void {
    const combo = this.selectedCombo();
    if (!combo) return;

    this.comboService
      .removeItem(combo.id, item.comboItemId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detail) => {
          this.comboDetail.set(detail);
          this.toastService.success('Đã xóa thành phần khỏi Combo');
          this.loadCombos();
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Không thể xóa thành phần');
        },
      });
  }

  // ── Edit Combo Price ──

  startEditPrice(): void {
    const detail = this.comboDetail();
    if (!detail) return;
    this.editingPriceValue = detail.basePrice;
    this.isEditingPrice.set(true);
  }

  cancelEditPrice(): void {
    this.isEditingPrice.set(false);
    this.editingPriceValue = 0;
  }

  saveComboPrice(): void {
    const combo = this.selectedCombo();
    const detail = this.comboDetail();
    if (!combo || !detail) return;

    if (this.editingPriceValue < 0) {
      this.toastService.warning('Giá bán phải >= 0');
      return;
    }

    if (this.editingPriceValue > this.calculatedPrice()) {
      this.modalService.confirm({
        nzTitle: 'Cảnh báo giá',
        nzContent: `Giá bán combo (<strong>${this.formatCurrency(this.editingPriceValue)}</strong>) lớn hơn tổng giá trị thành phần (<strong>${this.formatCurrency(this.calculatedPrice())}</strong>). Bạn có chắc chắn?`,
        nzOkText: 'Vẫn lưu',
        nzCancelText: 'Hủy',
        nzOnOk: () => this.doSaveComboPrice(combo, detail),
      });
    } else {
      this.doSaveComboPrice(combo, detail);
    }
  }

  private doSaveComboPrice(combo: Combo, detail: ComboDetail): void {
    const payload: UpdateProductRequestDto = {
      categoryId: combo.categoryId,
      code: detail.code,
      name: detail.name,
      basePrice: this.editingPriceValue,
      isCombo: true,
    };

    this.isSavingPrice.set(true);
    this.productService
      .updateJson(combo.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Đã cập nhật giá bán combo');
          this.isEditingPrice.set(false);
          this.isSavingPrice.set(false);
          this.selectedCombo.set({...combo, basePrice: this.editingPriceValue});
          this.comboDetail.set({...detail, basePrice: this.editingPriceValue});
          this.loadCombos();
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Không thể cập nhật giá');
          this.isSavingPrice.set(false);
        },
      });
  }

  // ── Helpers ──

  getStatusMeta(status: string) {
    return getComboStatusMeta(status);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(value || 0);
  }

  // ── Swap Variant Modal ──
  readonly isSwapModalVisible = signal<boolean>(false);
  readonly isSwapCalculating = signal<boolean>(false);
  readonly swapItem = signal<ComboItem | null>(null);
  readonly swapVariants = signal<ProductVariantOption[]>([]);
  readonly swapPricePreview = signal<CalculateComboPriceResponseDto | null>(null);
  swapNewVariantId = '';
  swapNewQuantity = 1;

  get swapModalTitle(): string {
    const item = this.swapItem();
    return item ? `Đổi biến thể — ${item.productName}` : 'Đổi biến thể';
  }

  openSwapModal(item: ComboItem): void {
    this.swapItem.set(item);
    this.swapNewVariantId = item.variantId;
    this.swapNewQuantity = item.quantity;
    this.swapPricePreview.set(null);
    this.swapVariants.set([]);
    this.isSwapModalVisible.set(true);

    // Load variants of the same product
    const product = this.products().find((p) => p.code === item.productCode);
    if (product) {
      this.productService
        .getVariants(product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (variants) => this.swapVariants.set(variants || []),
          error: () => this.swapVariants.set([]),
        });
    }
  }

  closeSwapModal(): void {
    this.isSwapModalVisible.set(false);
    this.swapItem.set(null);
    this.swapPricePreview.set(null);
  }

  onSwapVariantChange(variantId: string): void {
    this.swapNewVariantId = variantId;
    this.swapPricePreview.set(null);
  }

  previewSwapPrice(): void {
    const combo = this.selectedCombo();
    const item = this.swapItem();
    const detail = this.comboDetail();
    if (!combo || !item || !detail) return;

    if (this.swapNewVariantId === item.variantId) {
      this.toastService.warning('Biến thể mới giống biến thể hiện tại');
      return;
    }

    this.isSwapCalculating.set(true);
    this.comboService
      .calculatePrice({
        comboProductId: combo.id,
        originalComboPrice: detail.basePrice,
        items: [
          {
            originalComboItemId: item.comboItemId,
            newVariantId: this.swapNewVariantId,
            quantity: this.swapNewQuantity,
          },
        ],
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.swapPricePreview.set(res);
          this.isSwapCalculating.set(false);
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Không thể tính giá');
          this.isSwapCalculating.set(false);
        },
      });
  }

  confirmSwap(): void {
    const combo = this.selectedCombo();
    const detail = this.comboDetail();
    const item = this.swapItem();
    if (!combo || !detail || !item) {
      this.toastService.warning('Vui lòng xem giá trước khi xác nhận');
      return;
    }

    if (this.swapNewVariantId === item.variantId && this.swapNewQuantity === item.quantity) {
      this.toastService.warning('Biến thể mới giống biến thể hiện tại');
      return;
    }

    const items = detail.items.map(i =>
      i.comboItemId === item.comboItemId
        ? {variantId: this.swapNewVariantId, quantity: this.swapNewQuantity, isSubstitutable: i.isSubstitutable}
        : {variantId: i.variantId, quantity: i.quantity, isSubstitutable: i.isSubstitutable}
    );

    this.isSwapCalculating.set(true);
    this.comboService
      .syncItems(combo.id, items)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDetail) => {
          this.comboDetail.set(updatedDetail);
          this.toastService.success('Đã đổi biến thể thành công');
          this.isSwapCalculating.set(false);
          this.closeSwapModal();
          this.loadCombos();
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Không thể đổi biến thể');
          this.isSwapCalculating.set(false);
        },
      });
  }
}
