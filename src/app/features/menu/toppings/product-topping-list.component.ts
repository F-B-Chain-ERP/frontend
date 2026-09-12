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
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { BaseComponent } from '../../../shared/base-component/base.component';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppPaginationComponent } from '../../../shared/app-pagination/app-pagination.component';
import { AppBreadcrumbsComponent } from '../../../shared/app-breadcrumbs/app-breadcrumbs.component';
import { AppModalComponent } from '../../../shared/app-modal/app-modal.component';
import { HasSomeAuthorityDirective } from '../../../core/auth/has-some-authority.directive';
import { ROLE } from '../../../core/config/functions.constants';
import { ProductToppingService } from './product-topping.service';
import {
  AddProductToppingRequest,
  ProductItem,
  ProductTopping,
  ToppingItem,
  UpdateProductToppingRequest,
} from './topping-assignment.model';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '../../../shared/constants/constant';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-product-topping-list',
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
    NzSwitchModule,
    NzInputNumberModule,
    NzSpinModule,
    NzEmptyModule,
    NzPaginationModule,
    AppBreadcrumbsComponent,
    AppButtonComponent,
    AppPaginationComponent,
    AppModalComponent,
    HasSomeAuthorityDirective,
  ],
  templateUrl: './product-topping-list.component.html',
  styleUrls: ['./product-topping-list.component.scss'],
})
export class ProductToppingListComponent extends BaseComponent implements OnInit {
  readonly ROLE = ROLE;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  // ── Product selector state ──────────────────────────────────
  readonly products = signal<ProductItem[]>([]);
  readonly productTotal = signal(0);
  readonly isLoadingProducts = signal(false);
  readonly selectedProduct = signal<ProductItem | null>(null);
  productSearchQuery = '';
  productPageIndex = DEFAULT_PAGE_INDEX;
  productPageSize = 12;

  // ── Topping assignment state ────────────────────────────────
  readonly assignedToppings = signal<ProductTopping[]>([]);
  readonly isLoadingToppings = signal(false);
  readonly isSaving = signal(false);

  // ── Add topping modal ───────────────────────────────────────
  readonly isAddModalVisible = signal(false);
  readonly availableToppings = signal<ToppingItem[]>([]);
  readonly isLoadingToppingsList = signal(false);
  readonly addForm = this.fb.group({
    toppingId: this.fb.control<string | null>(null, [Validators.required]),
    isDefault: this.fb.control<boolean>(false),
    maxQuantity: this.fb.control<number>(1, [Validators.required, Validators.min(1)]),
  });

  // ── Edit topping modal ──────────────────────────────────────
  readonly isEditModalVisible = signal(false);
  editingRecord: ProductTopping | null = null;
  readonly editForm = this.fb.group({
    isDefault: this.fb.control<boolean>(false),
    maxQuantity: this.fb.control<number>(1, [Validators.required, Validators.min(1)]),
  });

  private readonly service = inject(ProductToppingService);

  // ── Lifecycle ───────────────────────────────────────────────

  ngOnInit(): void {
    this.breadcrumbsService.set([
      { label: 'Trang chủ', url: '/admin/home', icon: 'home' },
      { label: 'Thực đơn', url: '/admin/menu/products/list' },
      { label: 'Gán Topping cho Sản phẩm', url: '/admin/menu/toppings/assign' },
    ]);
    this.loadProducts();
  }

  // ── Product selector ────────────────────────────────────────

  loadProducts(): void {
    this.isLoadingProducts.set(true);
    this.service
      .getProducts(this.productSearchQuery, this.productPageIndex - 1, this.productPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.products.set(res.items);
          this.productTotal.set(res.total);
          this.isLoadingProducts.set(false);
        },
        error: err => {
          this.isLoadingProducts.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách sản phẩm.');
        },
      });
  }

  onProductSearch(): void {
    this.productPageIndex = DEFAULT_PAGE_INDEX;
    this.loadProducts();
  }

  onProductPageIndexChange(page: number): void {
    this.productPageIndex = page;
    this.loadProducts();
  }

  selectProduct(product: ProductItem): void {
    this.selectedProduct.set(product);
    this.loadAssignedToppings(product.id);
  }

  // ── Assigned toppings ───────────────────────────────────────

  loadAssignedToppings(productId: string): void {
    this.isLoadingToppings.set(true);
    this.service
      .listByProduct(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.assignedToppings.set(data || []);
          this.isLoadingToppings.set(false);
        },
        error: err => {
          this.isLoadingToppings.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách topping.');
        },
      });
  }

  // ── Add topping ─────────────────────────────────────────────

  openAddModal(): void {
    const product = this.selectedProduct();
    if (!product) {
      this.toastService.info('Vui lòng chọn sản phẩm trước');
      return;
    }
    this.addForm.reset({ toppingId: null, isDefault: false, maxQuantity: 1 });
    this.isAddModalVisible.set(true);
    this.loadAvailableToppings();
  }

  loadAvailableToppings(): void {
    this.isLoadingToppingsList.set(true);
    this.service
      .getToppings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.availableToppings.set(data || []);
          this.isLoadingToppingsList.set(false);
        },
        error: err => {
          this.isLoadingToppingsList.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể tải danh sách topping.');
        },
      });
  }

  onSubmitAdd(): void {
    if (!this.validateAndFocusFirstInvalid(this.addForm)) {
      return;
    }
    const product = this.selectedProduct();
    if (!product) return;

    const raw = this.addForm.getRawValue();
    const req: AddProductToppingRequest = {
      toppingId: raw.toppingId!,
      isDefault: raw.isDefault ?? false,
      maxQuantity: raw.maxQuantity ?? 1,
    };

    this.isSaving.set(true);
    this.service
      .add(product.id, req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastService.success('Thành công', 'Đã gán topping cho sản phẩm.');
          this.isAddModalVisible.set(false);
          this.loadAssignedToppings(product.id);
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể gán topping.');
        },
      });
  }

  // ── Edit topping config ─────────────────────────────────────

  openEditModal(record: ProductTopping): void {
    this.editingRecord = record;
    this.editForm.reset({
      isDefault: record.isDefault,
      maxQuantity: record.maxQuantity,
    });
    this.isEditModalVisible.set(true);
  }

  onSubmitEdit(): void {
    if (!this.validateAndFocusFirstInvalid(this.editForm)) {
      return;
    }
    if (!this.editingRecord) return;

    const raw = this.editForm.getRawValue();
    const req: UpdateProductToppingRequest = {
      isDefault: raw.isDefault ?? false,
      maxQuantity: raw.maxQuantity ?? 1,
    };

    this.isSaving.set(true);
    this.service
      .update(this.editingRecord.id, req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastService.success('Thành công', 'Đã cập nhật cấu hình topping.');
          this.isEditModalVisible.set(false);
          const product = this.selectedProduct();
          if (product) {
            this.loadAssignedToppings(product.id);
          }
        },
        error: err => {
          this.isSaving.set(false);
          this.toastService.error('Lỗi', err.message || 'Không thể cập nhật cấu hình.');
        },
      });
  }

  // ── Delete topping ──────────────────────────────────────────

  onDelete(record: ProductTopping): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận gỡ topping',
      nzContent: `Bạn có chắc muốn gỡ topping <strong>${record.toppingCode} - ${record.toppingName}</strong> khỏi sản phẩm này?`,
      nzOkText: 'Gỡ topping',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.service
          .delete(record.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.success('Thành công', 'Đã gỡ topping khỏi sản phẩm.');
              const product = this.selectedProduct();
              if (product) {
                this.loadAssignedToppings(product.id);
              }
            },
            error: err => this.toastService.error('Lỗi', err.message || 'Không thể gỡ topping.'),
          });
      },
    });
  }
}
