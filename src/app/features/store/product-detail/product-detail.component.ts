import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzInputDirective } from 'ng-zorro-antd/input';
import { AppQuantityStepperComponent } from '../../../shared/app-quantity-stepper/app-quantity-stepper.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { CartService } from '../../../shared/services/cart.service';
import { DrinkItem } from '../../../shared/app-drink-card/app-drink-card.component';
import { ComboItem, ProductDetail } from '../../menu/products/product.model';
import { ProductVariant } from '../../menu/products/variants/variant.model';
import { SalesService } from '../services/sales.service';
import { PosApiService } from '../services/pos-api.service';
import { StoreBranchService } from '../services/store-branch.service';
import {
  LevelOption,
  SizeOption,
  ToppingOption,
  defaultIceCode,
  defaultSugarCode,
  parseIceOptions,
  parseSizeOption,
  parseSugarOptions,
  toToppingOptions,
} from '../services/pos-options.util';

import { Subject, distinctUntilChanged, map, skip, takeUntil } from 'rxjs';
import { normalizeImageUrl, DEFAULT_BEVERAGE_IMAGE } from '../../../core/util/image.util';

export type DetailSizeOption = SizeOption;
export type DetailToppingOption = ToppingOption;

@Component({
  selector: 'app-product-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  imports: [CommonModule, FormsModule, RouterLink, NzIconDirective, NzInputDirective, AppQuantityStepperComponent],
  standalone: true,
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  @Input() id!: string;

  readonly isLoading = signal<boolean>(true);
  readonly product = signal<ProductDetail | null>(null);
  readonly normalizeImageUrl = normalizeImageUrl;
  readonly fallbackImage = DEFAULT_BEVERAGE_IMAGE;
  readonly availableSizes = signal<DetailSizeOption[]>([]);
  readonly selectedSize = signal<string>('');
  readonly availableSugarOptions = signal<LevelOption[]>([]);
  readonly selectedSugar = signal<string>('');
  readonly availableIceOptions = signal<LevelOption[]>([]);
  readonly selectedIce = signal<string>('');
  readonly selectedToppingIds = signal<Set<string>>(new Set());
  readonly quantity = signal<number>(1);
  readonly quickNotes: string[] = ['Ít ngọt', 'Nhiều đá', 'Để riêng đá mang về', 'Không lấy ống hút', 'Uống nóng'];

  /** Thành phần combo (chỉ có khi sản phẩm là combo). */
  readonly comboItems = signal<ComboItem[]>([]);

  /** Topping thật từ BE (thay hardcode). Load theo SP + chi nhánh. */
  readonly toppingOptions = signal<DetailToppingOption[]>([]);

  note = '';

  private readonly destroy$ = new Subject<void>();
  private readonly salesService = inject(SalesService);
  private readonly posApi = inject(PosApiService);
  private readonly storeBranches = inject(StoreBranchService);
  private readonly cartService = inject(CartService);
  private readonly toast = inject(AppNotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const routeId = this.id || this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.loadProductDetail(routeId);
    }
    // Đi từ món này sang món khác mà component không hủy: param đổi thì load lại.
    // skip(1) để bỏ emission hiện tại (đã load ở trên), tránh gọi API 2 lần lúc mở trang.
    this.route.paramMap
      .pipe(
        map(p => p.get('id')),
        distinctUntilChanged(),
        skip(1),
        takeUntil(this.destroy$),
      )
      .subscribe(id => {
        if (id) {
          this.loadProductDetail(id);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProductDetail(productId: string): void {
    this.isLoading.set(true);
    this.salesService
      .getProductDetail(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detail => {
          if (detail.imageUrl) {
            detail.imageUrl = normalizeImageUrl(detail.imageUrl);
          }
          this.product.set(detail);
          this.isLoading.set(false);
          this.comboItems.set(detail.comboItems ?? []);

          // Configure available sizes
          const basePrice = detail.basePrice || 0;
          if (detail.variants && detail.variants.length > 0) {
            const sizes = detail.variants.filter(v => !v.status || v.status === 'ACTIVE').map(v => parseSizeOption(v, basePrice));
            this.availableSizes.set(sizes);
            const defaultSize = sizes.find(s => s.extraPrice === 0) || sizes[0];
            this.selectedSize.set(defaultSize ? defaultSize.id : '');
          } else {
            this.availableSizes.set([
              {
                id: 'default',
                variantCode: 'STD',
                name: 'Tiêu chuẩn',
                sizeLabel: 'STD',
                volume: 'Chuẩn',
                extraPrice: 0,
                finalPrice: basePrice,
              },
            ]);
            this.selectedSize.set('default');
          }

          // Configure sugar/ice theo MÃ mức (BE lưu raw, hiển thị label)
          const sugar = parseSugarOptions(detail.availableSugarLevels);
          this.availableSugarOptions.set(sugar);
          this.selectedSugar.set(defaultSugarCode(sugar));

          const ice = parseIceOptions(detail.availableIceLevels);
          this.availableIceOptions.set(ice);
          this.selectedIce.set(defaultIceCode(ice));

          // Topping thật theo SP + chi nhánh (thay hardcode)
          this.selectedToppingIds.set(new Set());
          this.posApi
            .getProductToppings(productId, this.storeBranches.branchId())
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: list => this.toppingOptions.set(toToppingOptions(list)),
              error: () => this.toppingOptions.set([]),
            });
        },
        error: () => {
          this.isLoading.set(false);
          this.toast.error('Không tìm thấy thông tin sản phẩm', '');
        },
      });
  }

  isBeverage(detail: ProductDetail | null): boolean {
    if (!detail) return true;
    const cat = detail.categoryName?.toLowerCase() || '';
    if (cat.includes('bánh') || cat.includes('pastry') || cat.includes('snack') || cat.includes('đóng gói')) {
      return false;
    }
    if (!detail.availableSugarLevels && !detail.availableIceLevels) {
      return false;
    }
    return true;
  }

  applyQuickNote(noteTag: string): void {
    if (!this.note.trim()) {
      this.note = noteTag;
    } else if (!this.note.includes(noteTag)) {
      this.note = `${this.note.trim()}, ${noteTag}`;
    }
  }

  toggleTopping(id: string): void {
    const current = new Set(this.selectedToppingIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedToppingIds.set(current);
  }

  onQuantityChange(qty: number): void {
    this.quantity.set(Math.max(1, qty));
  }

  computeTotal(): number {
    const p = this.product();
    if (!p) return 0;

    let unit = p.basePrice || 0;
    const size = this.availableSizes().find(s => s.id === this.selectedSize());
    if (size) unit += size.extraPrice;

    for (const topId of this.selectedToppingIds()) {
      const top = this.toppingOptions().find(t => t.id === topId);
      if (top) unit += top.price;
    }

    return unit * this.quantity();
  }

  /** Label hiển thị cho mã mức (template dùng vì signal giữ mã gửi BE). */
  sugarLabel(code: string): string {
    return this.availableSugarOptions().find(o => o.code === code)?.label ?? code;
  }

  iceLabel(code: string): string {
    return this.availableIceOptions().find(o => o.code === code)?.label ?? code;
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;

    const drinkItem: DrinkItem = {
      id: p.id,
      name: p.name,
      category: p.categoryId,
      categoryName: p.categoryName || 'Đồ uống',
      price: p.basePrice || 0,
      imageUrl: normalizeImageUrl(p.imageUrl) || DEFAULT_BEVERAGE_IMAGE,
      description: p.description || '',
    };

    const sizeOpt = this.availableSizes().find(s => s.id === this.selectedSize());
    const selectedTops = this.toppingOptions().filter(t => this.selectedToppingIds().has(t.id));
    const qty = this.quantity();
    const noteText = this.note.trim();
    // 'default' = SP không size -> variantId null (BE A1 từ chối nếu SP có size mà không chọn).
    const variantId = this.selectedSize() && this.selectedSize() !== 'default' ? this.selectedSize() : null;

    this.cartService.addItem(
      drinkItem,
      {
        size: sizeOpt?.name || sizeOpt?.sizeLabel || 'Tiêu chuẩn',
        sizeExtra: sizeOpt?.extraPrice || 0,
        variantId,
        sugar: this.isBeverage(p) ? this.selectedSugar() : undefined,
        ice: this.isBeverage(p) ? this.selectedIce() : undefined,
        toppings: selectedTops,
        note: noteText || undefined,
      },
      qty,
      {
        title: `Đã thêm ${qty}x "${p.name}" vào giỏ hàng!`,
        message: noteText ? `Ghi chú: "${noteText}"` : 'Nhấp vào biểu tượng giỏ hàng để xem đơn hàng hoặc tiến hành thanh toán.',
      },
    );
  }

  formatPrice(amount: number | string | undefined | null): string {
    const val = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  goBack(): void {
    this.router.navigate(['/store']);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (target && target.src !== this.fallbackImage) {
      target.src = this.fallbackImage;
    }
  }
}

export default ProductDetailComponent;
