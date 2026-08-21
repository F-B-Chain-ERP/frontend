import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzInputDirective, NzInputPrefixDirective, NzInputWrapperComponent } from 'ng-zorro-antd/input';
import { NzOptionComponent, NzSelectComponent } from 'ng-zorro-antd/select';
import { AppButtonComponent } from '../../shared/app-button/app-button.component';
import { AppModalComponent } from '../../shared/app-modal/app-modal.component';
import { AppDrinkCardComponent, DrinkItem } from '../../shared/app-drink-card/app-drink-card.component';
import { AppNotificationService } from '../../shared/app-notification/app-notification.service';
import { CartService } from '../../shared/services/cart.service';

export interface CategoryTab {
  id: string;
  name: string;
  count: number;
}

export interface SizeOption {
  id: string;
  label: string;
  extraPrice: number;
}

export interface ToppingOption {
  id: string;
  label: string;
  price: number;
}

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
    AppButtonComponent,
    AppModalComponent,
    AppDrinkCardComponent,
  ],
  standalone: true,
})
export class StoreComponent implements OnInit {
  readonly cartService = inject(CartService);
  private readonly toast = inject(AppNotificationService);
  private readonly route = inject(ActivatedRoute);

  searchQuery = '';
  sortBy = 'featured';
  readonly selectedCategoryId = signal('all');
  newsletterEmail = '';

  // Modal customization state
  readonly isModalVisible = signal(false);
  readonly selectedDrink = signal<DrinkItem | null>(null);
  readonly selectedSize = signal<string>('M');
  readonly selectedSugar = signal<string>('100%');
  readonly selectedIce = signal<string>('100% đá');
  readonly selectedToppingIds = signal<Set<string>>(new Set());

  readonly sizeOptions: SizeOption[] = [
    { id: 'S', label: 'Nhỏ (S)', extraPrice: 0 },
    { id: 'M', label: 'Vừa (M)', extraPrice: 6000 },
    { id: 'L', label: 'Lớn (L)', extraPrice: 12000 },
  ];

  readonly sugarOptions = ['100% (Chuẩn)', '70%', '50%', 'Không đường'];
  readonly iceOptions = ['100% đá', '70% đá', '50% đá', 'Không đá', 'Uống nóng'];

  readonly toppingOptions: ToppingOption[] = [
    { id: 'pearl', label: 'Trân châu hoàng kim', price: 8000 },
    { id: 'peach', label: 'Thạch đào giòn', price: 10000 },
    { id: 'cheese', label: 'Kem phô mai Cheese Foam', price: 12000 },
    { id: 'lotus', label: 'Hạt sen Huế nấu đường phèn', price: 12000 },
  ];

  readonly categories: CategoryTab[] = [
    { id: 'all', name: 'Tất cả món', count: 12 },
    { id: 'traditional-coffee', name: 'Cà phê truyền thống', count: 3 },
    { id: 'espresso-machine', name: 'Cà phê pha máy', count: 3 },
    { id: 'fruit-tea', name: 'Trà trái cây tươi', count: 2 },
    { id: 'milk-tea', name: 'Trà sữa & Macchiato', count: 2 },
    { id: 'juice-pastry', name: 'Nước ép & Bánh ngọt', count: 2 },
  ];

  readonly styleCategories: StyleCategory[] = [
    {
      id: 'traditional-coffee',
      name: 'Cà Phê Truyền Thống',
      subtitle: 'Phin rang mộc & Bạc xỉu béo ngậy',
      imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'espresso-machine',
      name: 'Espresso & Cold Brew',
      subtitle: 'Arabica Cầu Đất & Ủ lạnh 18h thơm lừng',
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'fruit-tea',
      name: 'Trà Trái Cây Thanh Mát',
      subtitle: 'Đào cam sả & Trái cây nhiệt đới sảng khoái',
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'milk-tea',
      name: 'Trà Sữa & Đá Xay',
      subtitle: 'Oolong nướng than & Matcha kem cheese',
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
    },
  ];

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

  readonly drinksList: DrinkItem[] = [
    {
      id: 'c-1',
      name: 'Cà Phê Phin Sữa Đá Truyền Thống',
      category: 'traditional-coffee',
      categoryName: 'Cà phê truyền thống',
      price: 29000,
      originalPrice: 35000,
      imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
      description: 'Hạt Robusta Buôn Ma Thuột rang mộc đậm đà kết hợp sữa đặc ngọt béo thơm lừng.',
      badge: 'Best Seller',
      badgeType: 'bestseller',
    },
    {
      id: 'c-2',
      name: 'Cà Phê Muối Đặc Sản Xứ Huế',
      category: 'traditional-coffee',
      categoryName: 'Cà phê truyền thống',
      price: 38000,
      originalPrice: 42000,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
      description: 'Lớp kem béo mằn mặn bồng bềnh hòa quyện cùng vị cà phê đắng êm dịu độc đáo.',
      badge: 'Signature',
      badgeType: 'signature',
    },
    {
      id: 'c-3',
      name: 'Bạc Xỉu 3 Tầng Sữa Tươi',
      category: 'traditional-coffee',
      categoryName: 'Cà phê truyền thống',
      price: 32000,
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
      description: 'Vị béo ngậy ngọt lành từ sữa tươi thanh trùng kết hợp một chút hương cà phê nhẹ nhàng.',
    },
    {
      id: 'e-1',
      name: 'Caramel Macchiato Đá Xay',
      category: 'espresso-machine',
      categoryName: 'Cà phê pha máy',
      price: 49000,
      originalPrice: 55000,
      imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
      description: 'Espresso 100% Arabica Cầu Đất cùng sốt Caramel thủ công và sữa tươi sủi bọt mịn.',
      badge: 'Mới',
      badgeType: 'new',
    },
    {
      id: 'e-2',
      name: 'Espresso Double Shot Đậm Vị',
      category: 'espresso-machine',
      categoryName: 'Cà phê pha máy',
      price: 35000,
      imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80',
      description: 'Chiết xuất nguyên chất với lớp crema vàng óng ánh, vị chua thanh và hậu vị ngọt sâu.',
    },
    {
      id: 'e-3',
      name: 'Cold Brew Cam Vàng Sả Tươi',
      category: 'espresso-machine',
      categoryName: 'Cà phê pha máy',
      price: 48000,
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
      description: 'Cà phê ủ lạnh 18 tiếng mượt mà kết hợp tép cam vàng tươi mọng nước và sả thơm ngát.',
      badge: 'Signature',
      badgeType: 'signature',
    },
    {
      id: 't-1',
      name: 'Trà Đào Cam Sả Tươi Mát',
      category: 'fruit-tea',
      categoryName: 'Trà trái cây tươi',
      price: 45000,
      originalPrice: 50000,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
      description: 'Nước cốt trà đen Bảo Lộc thơm ngát cùng miếng đào giòn ngọt và tinh dầu sả tươi sảng khoái.',
      badge: 'Best Seller',
      badgeType: 'bestseller',
    },
    {
      id: 't-2',
      name: 'Trà Hoa Quả Nhiệt Đới Tươi Rót',
      category: 'fruit-tea',
      categoryName: 'Trà trái cây tươi',
      price: 49000,
      imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
      description: 'Thanh mát với chanh leo, táo, dưa hấu tươi và hạt chia giòn rụm bổ dưỡng.',
    },
    {
      id: 'm-1',
      name: 'Trà Sữa Oolong Nướng Than Củi',
      category: 'milk-tea',
      categoryName: 'Trà sữa & Macchiato',
      price: 42000,
      imageUrl: 'https://images.unsplash.com/photo-1558857563-b37cfb4226a2?auto=format&fit=crop&w=600&q=80',
      description: 'Lá trà Oolong sấy than củi đậm đà hòa quyện cùng trân châu hoàng kim dai giòn.',
      badge: 'Best Seller',
      badgeType: 'bestseller',
    },
    {
      id: 'm-2',
      name: 'Matcha Latte Nhật Bản Kem Cheese',
      category: 'milk-tea',
      categoryName: 'Trà sữa & Macchiato',
      price: 48000,
      imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
      description: 'Bột trà xanh Uji Kyoto thơm dịu kết hợp lớp phô mai béo ngậy mằn mặn.',
    },
    {
      id: 'j-1',
      name: 'Nước Ép Cam Tươi Nguyên Chất 100%',
      category: 'juice-pastry',
      categoryName: 'Nước ép & Bánh ngọt',
      price: 39000,
      imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
      description: 'Vắt tươi từ những quả cam sành mọng nước, không thêm đường hóa học, giàu Vitamin C.',
    },
    {
      id: 'j-2',
      name: 'Bánh Croissant Bơ Tỏi Pháp Nướng Nóng',
      category: 'juice-pastry',
      categoryName: 'Nước ép & Bánh ngọt',
      price: 35000,
      originalPrice: 40000,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
      description: 'Bánh sừng bò nghìn lớp giòn rụm thơm lừng bơ Pháp hảo hạng, ăn kèm tuyệt hảo cùng cà phê.',
      badge: 'Mới',
      badgeType: 'new',
    },
  ];

  // Slices for New Arrivals & Top Selling sections
  get newArrivals(): DrinkItem[] {
    return [this.drinksList[3], this.drinksList[5], this.drinksList[9], this.drinksList[11]];
  }

  get topSelling(): DrinkItem[] {
    return [this.drinksList[0], this.drinksList[1], this.drinksList[6], this.drinksList[8]];
  }

  readonly filteredDrinks = signal<DrinkItem[]>(this.drinksList);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.searchQuery = params['q'];
        this.onFilterChange();
        this.scrollToSection('all-drinks');
      }
    });
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
      `Chúng tôi đã lưu địa chỉ "${this.newsletterEmail}". Bạn sẽ nhận được các mã ưu đãi độc quyền sớm nhất!`
    );
    this.newsletterEmail = '';
  }

  onSelectCategory(catId: string): void {
    this.selectedCategoryId.set(catId);
    this.onFilterChange();
  }

  onFilterChange(): void {
    let list = [...this.drinksList];

    // Filter by Category
    if (this.selectedCategoryId() !== 'all') {
      list = list.filter(d => d.category === this.selectedCategoryId());
    }

    // Filter by Search Keyword
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(d => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
    }

    // Sort
    if (this.sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (this.sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    }

    this.filteredDrinks.set(list);
  }

  openCustomizeModal(drink: DrinkItem): void {
    this.selectedDrink.set(drink);
    this.selectedSize.set('M');
    this.selectedSugar.set('100%');
    this.selectedIce.set('100% đá');
    this.selectedToppingIds.set(new Set());
    this.isModalVisible.set(true);
  }

  quickAddToCart(drink: DrinkItem): void {
    this.openCustomizeModal(drink);
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

  computeCurrentModalTotal(): number {
    const drink = this.selectedDrink();
    if (!drink) return 0;

    let total = drink.price;
    const size = this.sizeOptions.find(s => s.id === this.selectedSize());
    if (size) total += size.extraPrice;

    for (const topId of this.selectedToppingIds()) {
      const top = this.toppingOptions.find(t => t.id === topId);
      if (top) total += top.price;
    }

    return total;
  }

  confirmAddToCart(): void {
    const drink = this.selectedDrink();
    if (!drink) return;

    const sizeOpt = this.sizeOptions.find(s => s.id === this.selectedSize());
    const selectedToppings = this.toppingOptions.filter(t => this.selectedToppingIds().has(t.id));

    this.cartService.addItem(
      drink,
      {
        size: this.selectedSize(),
        sizeExtra: sizeOpt?.extraPrice || 0,
        sugar: this.selectedSugar(),
        ice: this.selectedIce(),
        toppings: selectedToppings,
      },
      1
    );

    this.isModalVisible.set(false);
    this.toast.success(
      `Đã thêm "${drink.name}" (${this.selectedSize()}) vào giỏ hàng!`,
      `Nhấn vào biểu tượng giỏ hàng ở thanh tiêu đề để xem chi tiết hoặc thanh toán.`
    );
  }

  openCartSummary(): void {
    this.cartService.openCart();
  }
}
export default StoreComponent;
