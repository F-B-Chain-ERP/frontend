import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzInputDirective, NzInputPrefixDirective, NzInputWrapperComponent } from 'ng-zorro-antd/input';
import { NzOptionComponent, NzSelectComponent } from 'ng-zorro-antd/select';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { AppButtonComponent } from '../../shared/app-button/app-button.component';
import { AppModalComponent } from '../../shared/app-modal/app-modal.component';
import { AppDrinkCardComponent, DrinkItem } from '../../shared/app-drink-card/app-drink-card.component';
import { AppQuantityStepperComponent } from '../../shared/app-quantity-stepper/app-quantity-stepper.component';
import { AppNotificationService } from '../../shared/app-notification/app-notification.service';
import { CartService } from '../../shared/services/cart.service';
import { Category } from '../menu/categories/category.model';
import { Product, ProductDetail } from '../menu/products/product.model';
import { ProductVariant } from '../menu/products/variants/variant.model';
import { SalesService } from './services/sales.service';
import { PosApiService } from './services/pos-api.service';
import { StoreBranchService } from './services/store-branch.service';
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
} from './services/pos-options.util';
import { normalizeImageUrl, DEFAULT_BEVERAGE_IMAGE, DEFAULT_STYLE_IMAGE } from '../../core/util/image.util';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap, takeUntil } from 'rxjs';

export interface CategoryTab {
  id: string;
  name: string;
  count: number;
  icon: string;
}

export type { SizeOption, ToppingOption };

export interface CustomerReview {
  name: string;
  verified: boolean;
  rating: number;
  comment: string;
  date: string;
}

export interface StyleCategory {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string;
}

const FALLBACK_STYLE_IMAGE = DEFAULT_STYLE_IMAGE;

function getCategoryIcon(name: string): string {
  const lower = (name || '').toLowerCase();
  if (lower.includes('cà phê') || lower.includes('coffee') || lower.includes('espresso')) return 'coffee';
  if (lower.includes('trà sữa') || lower.includes('milktea') || lower.includes('macchiato')) return 'experiment';
  if (lower.includes('trà') || lower.includes('tea')) return 'heart';
  if (lower.includes('đá xay') || lower.includes('freeze') || lower.includes('smoothie')) return 'cloud';
  if (lower.includes('bánh') || lower.includes('pastry') || lower.includes('snack') || lower.includes('croissant')) return 'shop';
  if (lower.includes('gói') || lower.includes('hạt') || lower.includes('bean') || lower.includes('quà')) return 'gift';
  return 'appstore';
}

@Component({
  selector: 'app-store',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './store.component.html',
  styleUrls: ['./store.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    NzIconDirective,
    NzInputDirective,
    NzInputPrefixDirective,
    NzInputWrapperComponent,
    NzSelectComponent,
    NzOptionComponent,
    NzPaginationModule,
    AppButtonComponent,
    AppModalComponent,
    AppDrinkCardComponent,
    AppQuantityStepperComponent,
  ],
  standalone: true,
})
export class StoreComponent implements OnInit, OnDestroy {
  readonly cartService = inject(CartService);
  readonly storeBranches = inject(StoreBranchService);
  private readonly toast = inject(AppNotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly salesService = inject(SalesService);
  private readonly posApi = inject(PosApiService);
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();
  private readonly detailRequest$ = new Subject<DrinkItem>();

  readonly normalizeImageUrl = normalizeImageUrl;

  // Filter & Search states
  searchQuery = '';
  sortBy = 'featured';
  readonly selectedCategoryId = signal<string>('all');
  newsletterEmail = '';

  // Loading signals for Skeleton UI
  readonly isLoadingProducts = signal<boolean>(true);
  readonly isLoadingCategories = signal<boolean>(true);
  readonly isLoadingVariants = signal<boolean>(false);
  readonly isLoadingDetail = signal<boolean>(false);

  // Real data signals
  readonly rawProducts = signal<Product[]>([]);
  readonly drinksList = signal<DrinkItem[]>([]);
  readonly filteredDrinks = signal<DrinkItem[]>([]);
  readonly newArrivals = signal<DrinkItem[]>([]);
  readonly topSelling = signal<DrinkItem[]>([]);

  // Pagination for All Drinks grid
  readonly pageIndex = signal(1);
  readonly pageSize = signal(20);
  readonly pageSizeOptions = [8, 12, 16, 20, 24];

  readonly pagedDrinks = computed(() => {
    const list = this.filteredDrinks();
    const start = (this.pageIndex() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  get totalFilteredDrinks(): number {
    return this.filteredDrinks().length;
  }

  get rangeFrom(): number {
    const total = this.totalFilteredDrinks;
    if (total === 0) return 0;
    return (this.pageIndex() - 1) * this.pageSize() + 1;
  }

  get rangeTo(): number {
    return Math.min(this.pageIndex() * this.pageSize(), this.totalFilteredDrinks);
  }

  // Category Tabs & Style Categories
  readonly categories = signal<CategoryTab[]>([{ id: 'all', name: 'Tất cả món', count: 0, icon: 'appstore' }]);

  // Tab danh mục hiển thị: luôn có "Tất cả món", các danh mục không có sản phẩm bị ẩn
  readonly categoryTabs = computed(() => {
    const tabs = this.categories();
    return tabs.filter(c => c.id === 'all' || c.count > 0);
  });
  readonly styleCategories = signal<StyleCategory[]>([]);

  // Modal 2: Customize Order (Size, Sugar, Ice, Toppings, Note, Quantity)
  readonly isModalVisible = signal<boolean>(false);
  readonly selectedDrink = signal<DrinkItem | null>(null);
  readonly selectedProductDetail = signal<ProductDetail | null>(null);
  readonly availableSizes = signal<SizeOption[]>([]);
  readonly selectedSize = signal<string>('');
  readonly availableSugarOptions = signal<LevelOption[]>([]);
  readonly selectedSugar = signal<string>('');
  readonly availableIceOptions = signal<LevelOption[]>([]);
  readonly selectedIce = signal<string>('');
  readonly selectedToppingIds = signal<Set<string>>(new Set());
  readonly modalQuantity = signal<number>(1);
  modalNote = '';

  readonly quickNotes: string[] = ['Ít ngọt', 'Nhiều đá', 'Để riêng đá mang về', 'Không lấy ống hút', 'Uống nóng'];

  /** Topping thật từ BE theo SP + chi nhánh (thay hardcode). */
  readonly toppingOptions = signal<ToppingOption[]>([]);

  // Verified Customer Reviews
  readonly customerReviews: CustomerReview[] = [
    {
      name: 'Sarah M.',
      verified: true,
      rating: 5,
      comment:
        'Cà phê phin sữa đá ở đây đậm đà đúng chất Robusta mộc, lớp sữa béo vừa phải không bị gắt. Giao hàng rất nhanh chỉ 15 phút là tới nơi!',
      date: '14/08/2026',
    },
    {
      name: 'Alex K.',
      verified: true,
      rating: 5,
      comment:
        'Trà đào cam sả và Cold Brew cam vàng cực kỳ tươi mát, thơm sả tự nhiên. Đồ uống cứu cánh cho cả ngày làm việc tập trung cao độ.',
      date: '18/08/2026',
    },
    {
      name: 'James L.',
      verified: true,
      rating: 5,
      comment:
        'Bánh sừng bò nướng nóng hổi giòn tan ăn kèm Caramel Macchiato là combo hoàn hảo cho bữa sáng. Rất ưng ý với chất lượng phục vụ của UTT.CO!',
      date: '20/08/2026',
    },
  ];

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['q']) {
        this.searchQuery = params['q'];
        this.onFilterChange();
        this.scrollToSection('all-drinks');
      }
    });

    // Gõ search debounce 300ms thay vì lọc mỗi ký tự
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => this.onFilterChange());

    // Chi tiết modal đi qua switchMap: bấm món khác khi request cũ chưa về
    // thì hủy request cũ, response cũ không ghi đè modal mới (hết race).
    this.detailRequest$
      .pipe(
        switchMap(drink =>
          this.salesService.getProductDetail(drink.id).pipe(
            map(detail => ({ drink, detail })),
            catchError(() => of({ drink, detail: null as ProductDetail | null })),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe(({ drink, detail }) => {
        this.isLoadingVariants.set(false);
        if (detail) {
          this.applyProductDetail(detail);
        } else {
          this.applyProductDetailFallback(drink);
        }
      });

    this.loadStoreCategories();
    this.loadStoreProducts();

    // Chi nhánh đặt món: có branch mới tải giỏ server (giỏ gắn theo branch).
    this.storeBranches
      .loadBranches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.cartService.refresh(), error: () => undefined });
  }

  onBranchChange(branchId: string): void {
    this.storeBranches.selectBranch(branchId);
    this.cartService.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(query: string): void {
    this.searchQuery = query ?? '';
    this.search$.next(this.searchQuery);
  }

  /**
   * Tải danh mục thực tế từ SalesService
   */
  loadStoreCategories(): void {
    this.isLoadingCategories.set(true);
    this.salesService
      .getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.isLoadingCategories.set(false);
          const activeCats = res.items || [];
          this.applyCategories(activeCats);
        },
        error: () => {
          this.isLoadingCategories.set(false);
        },
      });
  }

  /**
   * Tải danh sách sản phẩm thực tế từ SalesService
   */
  loadStoreProducts(): void {
    this.isLoadingProducts.set(true);
    this.salesService
      .getProducts({ pageSize: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.isLoadingProducts.set(false);
          const products = res.items || [];
          this.rawProducts.set(products);
          this.processProducts(products);
        },
        error: () => {
          this.isLoadingProducts.set(false);
          this.toast.error('Không thể tải thực đơn đồ uống. Vui lòng thử lại sau!', '');
        },
      });
  }

  /**
   * Xử lý danh sách Category và xây dựng Tab danh mục, khối Gu thưởng thức
   */
  private applyCategories(cats: Category[]): void {
    const products = this.drinksList();
    const tabs: CategoryTab[] = [
      { id: 'all', name: 'Tất cả món', count: products.length, icon: 'appstore' },
      ...cats.map(c => ({
        id: c.id,
        name: c.name,
        count: products.filter(p => p.category === c.id).length,
        icon: getCategoryIcon(c.name),
      })),
    ];
    this.categories.set(tabs);

    // Khối "Khám phá theo gu" lấy trực tiếp ảnh và mô tả thật của danh mục
    this.styleCategories.set(
      cats.slice(0, 4).map(c => ({
        id: c.id,
        name: c.name,
        subtitle: c.description || 'Thưởng thức phong vị hảo hạng mỗi ngày',
        imageUrl: normalizeImageUrl(c.imageUrl) || FALLBACK_STYLE_IMAGE,
      })),
    );
  }

  /**
   * Xử lý danh sách Product thật từ BE:
   * - Chuyển sang format DrinkItem
   * - Cập nhật số lượng cho tab danh mục
   * - Phân bổ New Arrivals và Top Selling
   */
  private processProducts(products: Product[]): void {
    const items: DrinkItem[] = products.map(p => this.mapProductToDrinkItem(p));
    this.drinksList.set(items);

    // Cập nhật lại số lượng sản phẩm trong từng tab danh mục
    const currentTabs = this.categories();
    const updatedTabs = currentTabs.map(tab => {
      if (tab.id === 'all') {
        return { ...tab, count: items.length };
      }
      return {
        ...tab,
        count: items.filter(d => d.category === tab.id).length,
      };
    });
    this.categories.set(updatedTabs);

    // Tra cứu O(1) qua Map thay vì find() trong comparator/filter (trước đây O(n² log n)).
    const byId = new Map(products.map(p => [p.id, p] as const));

    // Phân luồng: Món mới nhất (New Arrivals: 4 món mới nhất theo ngày tạo)
    const sortedByDate = [...items].sort((a, b) => {
      const createdA = byId.get(a.id)?.createdAt;
      const createdB = byId.get(b.id)?.createdAt;
      const dateA = createdA ? new Date(createdA).getTime() : 0;
      const dateB = createdB ? new Date(createdB).getTime() : 0;
      return dateB - dateA;
    });
    this.newArrivals.set(sortedByDate.slice(0, 4));

    // Phân luồng: Món bán chạy nhất
    const topItems = items.filter(d => {
      const raw = byId.get(d.id);
      return raw?.isBestSeller || raw?.isFeatured;
    });
    this.topSelling.set(topItems.length > 0 ? topItems.slice(0, 4) : items.slice(0, 4));

    this.onFilterChange();
  }

  /**
   * Chuyển đổi Product entity thành DrinkItem cho DrinkCard và Cart
   */
  private mapProductToDrinkItem(p: Product): DrinkItem {
    let badge: string | undefined;
    let badgeType: 'signature' | 'bestseller' | 'new' | undefined;

    if (p.isBestSeller) {
      badge = 'Best Seller';
      badgeType = 'bestseller';
    } else if (p.isFeatured) {
      badge = 'Signature';
      badgeType = 'signature';
    } else if (this.isRecentProduct(p.createdAt)) {
      badge = 'Mới';
      badgeType = 'new';
    }

    return {
      id: p.id,
      name: p.name,
      category: p.categoryId,
      categoryName: p.categoryName || 'Đồ uống',
      price: Number(p.basePrice) || 0,
      imageUrl: normalizeImageUrl(p.imageUrl) || DEFAULT_BEVERAGE_IMAGE,
      description: p.description || 'Thức uống thủ công tươi mới từ nguyên liệu tự nhiên chọn lọc.',
      badge,
      badgeType,
    };
  }

  private isRecentProduct(createdAt?: string | null): boolean {
    if (!createdAt) return false;
    const createdTime = new Date(createdAt).getTime();
    const daysDiff = (Date.now() - createdTime) / (1000 * 3600 * 24);
    return daysDiff <= 30;
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  scrollToSection(sectionId: string): void {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  selectStyleCategory(catId: string): void {
    this.onSelectCategory(catId);
    this.scrollToSection('all-drinks');
  }

  subscribeNewsletter(): void {
    if (!this.newsletterEmail.trim()) {
      this.toast.warning('Vui lòng nhập địa chỉ email của bạn!', '');
      return;
    }
    this.toast.success(
      'Đăng ký thành công!',
      `Chúng tôi đã lưu địa chỉ "${this.newsletterEmail}". Bạn sẽ nhận được các mã ưu đãi độc quyền sớm nhất!`,
    );
    this.newsletterEmail = '';
  }

  onSelectCategory(catId: string): void {
    this.selectedCategoryId.set(catId);
    this.onFilterChange();
  }

  onPageIndexChange(index: number): void {
    this.pageIndex.set(Math.max(1, index));
    this.scrollToSection('all-drinks');
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
    this.scrollToSection('all-drinks');
  }

  /**
   * Lọc và sắp xếp sản phẩm linh hoạt
   */
  onFilterChange(): void {
    let list = [...this.drinksList()];

    // Lọc theo Danh mục
    if (this.selectedCategoryId() !== 'all') {
      list = list.filter(d => d.category === this.selectedCategoryId());
    }

    // Lọc theo Từ khóa tìm kiếm
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(
        d => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.categoryName.toLowerCase().includes(q),
      );
    }

    // Sắp xếp
    if (this.sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (this.sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (this.sortBy === 'newest') {
      const rawMap = new Map(this.rawProducts().map(p => [p.id, p]));
      list.sort((a, b) => {
        const createdA = rawMap.get(a.id)?.createdAt;
        const createdB = rawMap.get(b.id)?.createdAt;
        const dateA = createdA ? new Date(createdA).getTime() : 0;
        const dateB = createdB ? new Date(createdB).getTime() : 0;
        return dateB - dateA;
      });
    }

    this.filteredDrinks.set(list);
    this.pageIndex.set(1);
  }

  /**
   * Kiểm tra xem sản phẩm có phải đồ uống (có mức đường/đá) hay không
   */
  isBeverage(item?: DrinkItem | ProductDetail | null): boolean {
    if (!item) return true;
    const cat = (item as any).categoryName || '';
    const lower = cat.toLowerCase();
    if (lower.includes('bánh') || lower.includes('pastry') || lower.includes('snack') || lower.includes('đóng gói')) {
      return false;
    }
    const detail = this.selectedProductDetail();
    if (detail && !detail.availableSugarLevels && !detail.availableIceLevels) {
      return false;
    }
    return true;
  }

  // ── 1. ĐIỀU HƯỚNG SANG TRANG CHI TIẾT SẢN PHẨM & BIẾN THỂ ─────────
  /**
   * Chuyển hướng sang trang chi tiết sản phẩm /store/product/:id
   * Nơi khách hàng có thể xem đầy đủ thông số, bảng biến thể và đặt món trực tiếp
   */
  goToProductDetail(drink: DrinkItem): void {
    this.router.navigate(['/store/product', drink.id]);
  }

  // ── 2. MODAL TÙY CHỈNH CHỌN MÓN ĐẶT HÀNG NHANH (Quick Order) ───────
  onModalVisibleChange(visible: boolean): void {
    this.isModalVisible.set(visible);
    if (typeof document !== 'undefined') {
      if (visible) {
        document.body.classList.add('modal-open');
      } else {
        document.body.classList.remove('modal-open');
      }
    }
  }

  closeCustomizeModal(): void {
    this.onModalVisibleChange(false);
  }

  /**
   * Mở Modal Tùy chỉnh: Lấy chi tiết sản phẩm và danh sách biến thể / kích cỡ thực tế từ BE
   */
  openCustomizeModal(drink: DrinkItem): void {
    this.selectedDrink.set(drink);
    this.modalQuantity.set(1);
    this.modalNote = '';
    this.selectedToppingIds.set(new Set());
    this.isLoadingVariants.set(true);
    this.onModalVisibleChange(true);

    // Đi qua detailRequest$ (switchMap): tự hủy request cũ nếu bấm món khác
    this.detailRequest$.next(drink);
  }

  private applyProductDetail(detail: ProductDetail): void {
    this.selectedProductDetail.set(detail);

    // 1. Cấu hình Size thực tế từ variants
    if (detail.variants && detail.variants.length > 0) {
      const sizes: SizeOption[] = detail.variants
        .filter(v => !v.status || v.status === 'ACTIVE')
        .map(v => parseSizeOption(v, Number(detail.basePrice) || 0));
      this.availableSizes.set(sizes);
      // Mặc định chọn size đầu tiên hoặc size có giá gốc extraPrice = 0
      const defaultSize = sizes.find(s => s.extraPrice === 0) || sizes[0];
      this.selectedSize.set(defaultSize ? defaultSize.id : '');
    } else {
      // Sản phẩm không có biến thể size (bánh ngọt hoặc đồ uống 1 size)
      this.availableSizes.set([
        {
          id: 'default',
          variantCode: 'STD',
          name: 'Tiêu chuẩn',
          sizeLabel: 'STD',
          volume: 'Chuẩn',
          extraPrice: 0,
          finalPrice: Number(detail.basePrice) || 0,
        },
      ]);
      this.selectedSize.set('default');
    }

    // 2. Cấu hình Mức đường (gửi MÃ mức cho BE)
    const sugarOpts = parseSugarOptions(detail.availableSugarLevels);
    this.availableSugarOptions.set(sugarOpts);
    this.selectedSugar.set(defaultSugarCode(sugarOpts));

    // 3. Cấu hình Mức đá (gửi MÃ mức cho BE)
    const iceOpts = parseIceOptions(detail.availableIceLevels);
    this.availableIceOptions.set(iceOpts);
    this.selectedIce.set(defaultIceCode(iceOpts));

    // 4. Topping thật theo SP + chi nhánh
    this.posApi
      .getProductToppings(detail.id, this.storeBranches.branchId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => this.toppingOptions.set(toToppingOptions(list)),
        error: () => this.toppingOptions.set([]),
      });
  }

  private applyProductDetailFallback(drink: DrinkItem): void {
    this.availableSizes.set([
      {
        id: 'default',
        variantCode: 'STD',
        name: 'Tiêu chuẩn',
        sizeLabel: 'STD',
        volume: 'Chuẩn',
        extraPrice: 0,
        finalPrice: drink.price,
      },
    ]);
    this.selectedSize.set('default');
    const fallbackSugar = parseSugarOptions(null);
    this.availableSugarOptions.set(fallbackSugar);
    this.selectedSugar.set(defaultSugarCode(fallbackSugar));
    const fallbackIce = parseIceOptions(null);
    this.availableIceOptions.set(fallbackIce);
    this.selectedIce.set(defaultIceCode(fallbackIce));
    this.toppingOptions.set([]);
  }

  quickAddToCart(drink: DrinkItem): void {
    this.openCustomizeModal(drink);
  }

  applyQuickNote(noteTag: string): void {
    if (!this.modalNote.trim()) {
      this.modalNote = noteTag;
    } else if (!this.modalNote.includes(noteTag)) {
      this.modalNote = `${this.modalNote.trim()}, ${noteTag}`;
    }
  }

  sugarLabel(code: string): string {
    return this.availableSugarOptions().find(o => o.code === code)?.label ?? code;
  }

  iceLabel(code: string): string {
    return this.availableIceOptions().find(o => o.code === code)?.label ?? code;
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
    this.modalQuantity.set(Math.max(1, qty));
  }

  computeCurrentModalTotal(): number {
    const drink = this.selectedDrink();
    if (!drink) return 0;

    let unitPrice = drink.price;
    const size = this.availableSizes().find(s => s.id === this.selectedSize());
    if (size) {
      unitPrice += size.extraPrice;
    }

    for (const topId of this.selectedToppingIds()) {
      const top = this.toppingOptions().find(t => t.id === topId);
      if (top) unitPrice += top.price;
    }

    return unitPrice * this.modalQuantity();
  }

  confirmAddToCart(): void {
    const drink = this.selectedDrink();
    if (!drink) return;

    const sizeOpt = this.availableSizes().find(s => s.id === this.selectedSize());
    const selectedToppings = this.toppingOptions().filter(t => this.selectedToppingIds().has(t.id));
    const qty = this.modalQuantity();
    const noteText = this.modalNote.trim();
    const variantId = this.selectedSize() && this.selectedSize() !== 'default' ? this.selectedSize() : null;

    this.cartService.addItem(
      drink,
      {
        size: sizeOpt?.name || sizeOpt?.sizeLabel || this.selectedSize(),
        sizeExtra: sizeOpt?.extraPrice || 0,
        variantId,
        sugar: this.isBeverage(drink) ? this.selectedSugar() : undefined,
        ice: this.isBeverage(drink) ? this.selectedIce() : undefined,
        toppings: selectedToppings,
        note: noteText || undefined,
      },
      qty,
    );

    this.closeCustomizeModal();
    this.toast.success(
      `Đã thêm ${qty}x "${drink.name}" vào giỏ hàng!`,
      noteText ? `Ghi chú: "${noteText}"` : 'Nhấn vào biểu tượng giỏ hàng để xem chi tiết hoặc thanh toán.',
    );
  }

  openCartSummary(): void {
    this.cartService.openCart();
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (target && target.src !== DEFAULT_BEVERAGE_IMAGE) {
      target.src = DEFAULT_BEVERAGE_IMAGE;
    }
  }
}

export default StoreComponent;
