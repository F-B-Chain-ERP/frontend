import {ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {NzIconDirective} from 'ng-zorro-antd/icon';
import {NzInputDirective} from 'ng-zorro-antd/input';
import {AppQuantityStepperComponent} from '../../../shared/app-quantity-stepper/app-quantity-stepper.component';
import {AppNotificationService} from '../../../shared/app-notification/app-notification.service';
import {CartService} from '../../../shared/services/cart.service';
import {DrinkItem} from '../../../shared/app-drink-card/app-drink-card.component';
import {ProductDetail} from '../../menu/products/product.model';
import {ProductVariant} from '../../menu/products/variants/variant.model';
import {SalesService} from '../services/sales.service';
import {Subject, distinctUntilChanged, map, skip, takeUntil} from 'rxjs';
import {normalizeImageUrl, DEFAULT_BEVERAGE_IMAGE} from '../../../core/util/image.util';

export interface DetailSizeOption {
  id: string;
  variantCode: string;
  name: string;
  sizeLabel: string;
  volume: string;
  extraPrice: number;
  finalPrice: number;
}

export interface DetailToppingOption {
  id: string;
  label: string;
  price: number;
}

function parseSizeOption(v: ProductVariant, basePrice: number): DetailSizeOption {
  const label = (v.sizeLabel || '').trim().toUpperCase();
  const code = (v.variantCode || '').trim().toUpperCase();
  let volume = 'Tiêu chuẩn';
  let name = v.variantName || `Size ${label || 'Chuẩn'}`;

  if (label === 'S' || code.includes('-S') || code.endsWith('S')) {
    volume = '355ml';
    if (!v.variantName) name = 'Size Nhỏ (S)';
  } else if (label === 'M' || code.includes('-M') || code.endsWith('M')) {
    volume = '500ml';
    if (!v.variantName) name = 'Size Vừa (M)';
  } else if (label === 'L' || code.includes('-L') || code.endsWith('L')) {
    volume = '700ml';
    if (!v.variantName) name = 'Size Lớn (L)';
  } else if (label === 'XL' || code.includes('-XL') || code.endsWith('XL')) {
    volume = '850ml';
    if (!v.variantName) name = 'Size Khổng Lồ (XL)';
  }

  const extra = Number(v.priceDelta) || 0;
  return {
    id: v.id,
    variantCode: v.variantCode,
    name,
    sizeLabel: label || 'STD',
    volume,
    extraPrice: extra,
    finalPrice: basePrice + extra,
  };
}

@Component({
  selector: 'app-product-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzIconDirective,
    NzInputDirective,
    AppQuantityStepperComponent,
  ],
  standalone: true,
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  @Input() id!: string;

  private readonly destroy$ = new Subject<void>();
  private readonly salesService = inject(SalesService);
  private readonly cartService = inject(CartService);
  private readonly toast = inject(AppNotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal<boolean>(true);
  readonly product = signal<ProductDetail | null>(null);

  readonly normalizeImageUrl = normalizeImageUrl;
  readonly fallbackImage = DEFAULT_BEVERAGE_IMAGE;

  // Customization state for direct ordering
  readonly availableSizes = signal<DetailSizeOption[]>([]);
  readonly selectedSize = signal<string>('');
  readonly availableSugarOptions = signal<string[]>([]);
  readonly selectedSugar = signal<string>('');
  readonly availableIceOptions = signal<string[]>([]);
  readonly selectedIce = signal<string>('');
  readonly selectedToppingIds = signal<Set<string>>(new Set());
  readonly quantity = signal<number>(1);
  note = '';

  readonly quickNotes: string[] = [
    'Ít ngọt',
    'Nhiều đá',
    'Để riêng đá mang về',
    'Không lấy ống hút',
    'Uống nóng',
  ];

  readonly toppingOptions: DetailToppingOption[] = [
    {id: 'pearl', label: 'Trân châu hoàng kim', price: 8000},
    {id: 'peach', label: 'Thạch đào giòn giòn', price: 10000},
    {id: 'cheese', label: 'Kem phô mai Cheese Foam', price: 12000},
    {id: 'lotus', label: 'Hạt sen Huế nấu đường phèn', price: 12000},
  ];

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
        takeUntil(this.destroy$)
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
    this.salesService.getProductDetail(productId).pipe(takeUntil(this.destroy$)).subscribe({
      next: detail => {
        if (detail.imageUrl) {
          detail.imageUrl = normalizeImageUrl(detail.imageUrl);
        }
        this.product.set(detail);
        this.isLoading.set(false);

        // Configure available sizes
        const basePrice = Number(detail.basePrice) || 0;
        if (detail.variants && detail.variants.length > 0) {
          const sizes = detail.variants
            .filter(v => !v.status || v.status === 'ACTIVE')
            .map(v => parseSizeOption(v, basePrice));
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

        // Configure sugar options
        const sugar = this.parseSugarOptions(detail.availableSugarLevels);
        this.availableSugarOptions.set(sugar);
        this.selectedSugar.set(sugar.includes('100% (Chuẩn)') ? '100% (Chuẩn)' : sugar[0] || '');

        // Configure ice options
        const ice = this.parseIceOptions(detail.availableIceLevels);
        this.availableIceOptions.set(ice);
        this.selectedIce.set(ice.includes('100% đá (Chuẩn)') ? '100% đá (Chuẩn)' : ice[0] || '');
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

  private parseSugarOptions(csvStr?: string | null): string[] {
    if (!csvStr || !csvStr.trim()) {
      return ['0%', '30%', '50%', '70%', '100% (Chuẩn)'];
    }
    const levels = csvStr.split(',').map(s => s.trim()).filter(Boolean);
    const mapLevel = (lvl: string) => {
      if (lvl === '100') return '100% (Chuẩn)';
      if (lvl === '0') return 'Không đường (0%)';
      return `${lvl}%`;
    };
    return levels.map(mapLevel);
  }

  private parseIceOptions(csvStr?: string | null): string[] {
    if (!csvStr || !csvStr.trim()) {
      return ['100% đá (Chuẩn)', '70% đá', '50% đá', 'Không đá (0%)', 'Uống nóng'];
    }
    const levels = csvStr.split(',').map(s => s.trim()).filter(Boolean);
    const mapLevel = (lvl: string) => {
      if (lvl === '100') return '100% đá (Chuẩn)';
      if (lvl === '0') return 'Không đá (0%)';
      return `${lvl}% đá`;
    };
    const parsed = levels.map(mapLevel);
    if (!parsed.some(s => s.toLowerCase().includes('nóng'))) {
      parsed.push('Uống nóng');
    }
    return parsed;
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

    let unit = Number(p.basePrice) || 0;
    const size = this.availableSizes().find(s => s.id === this.selectedSize());
    if (size) unit += size.extraPrice;

    for (const topId of this.selectedToppingIds()) {
      const top = this.toppingOptions.find(t => t.id === topId);
      if (top) unit += top.price;
    }

    return unit * this.quantity();
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;

    const drinkItem: DrinkItem = {
      id: p.id,
      name: p.name,
      category: p.categoryId,
      categoryName: p.categoryName || 'Đồ uống',
      price: Number(p.basePrice) || 0,
      imageUrl: normalizeImageUrl(p.imageUrl) || DEFAULT_BEVERAGE_IMAGE,
      description: p.description || '',
    };

    const sizeOpt = this.availableSizes().find(s => s.id === this.selectedSize());
    const selectedTops = this.toppingOptions.filter(t => this.selectedToppingIds().has(t.id));
    const qty = this.quantity();
    const noteText = this.note.trim();

    this.cartService.addItem(
      drinkItem,
      {
        size: sizeOpt?.name || sizeOpt?.sizeLabel || 'Tiêu chuẩn',
        sizeExtra: sizeOpt?.extraPrice || 0,
        sugar: this.isBeverage(p) ? this.selectedSugar() : undefined,
        ice: this.isBeverage(p) ? this.selectedIce() : undefined,
        toppings: selectedTops,
      },
      qty
    );

    this.toast.success(
      `Đã thêm ${qty}x "${p.name}" vào giỏ hàng!`,
      noteText ? `Ghi chú: "${noteText}"` : 'Nhấp vào biểu tượng giỏ hàng để xem đơn hàng hoặc tiến hành thanh toán.'
    );
  }

  formatPrice(amount: number | string | undefined | null): string {
    const val = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(val);
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
