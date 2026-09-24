import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, concatMap, from, toArray } from 'rxjs';
import { AccountService } from '../../core/auth/account.service';
import { normalizeImageUrl, DEFAULT_BEVERAGE_IMAGE } from '../../core/util/image.util';
import { DrinkItem } from '../app-drink-card/app-drink-card.component';
import { AppNotificationService } from '../app-notification/app-notification.service';
import { PosApiService } from '../../features/store/services/pos-api.service';
import { PosCartItem } from '../../features/store/models/pos.model';
import { ComboItem } from '../../features/menu/products/product.model';
import { StoreBranchService } from '../../features/store/services/store-branch.service';

export interface CartItemOption {
  size?: string;
  sizeExtra?: number;
  sugar?: string;
  ice?: string;
  toppings?: { id: string; label: string; price: number }[];
  /** UUID variant BE (undefined = SP không size). Không bao giờ gửi 'default'. */
  variantId?: string | null;
  /** Ghi chú khách (trước đây chỉ toast, không gửi BE). */
  note?: string | null;
}

export interface CartItem {
  id: string;
  drink: DrinkItem;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  optionsSummary: string;
  options: CartItemOption;
  /** Thành phần combo (chỉ SPM combo). */
  comboItems?: ComboItem[];
}

/**
 * Giỏ hàng đồng bộ server-truth (BE tính giá/tồn/topping).
 * Giữ nguyên API signal cũ để component không phải sửa:
 * items/totalCount/totalAmount/isEmpty + addItem/setQuantity/removeItem/clearCart.
 * Ảnh/danh mục BE không trả nên cache snapshot lúc thêm (merge theo productId khi refresh).
 */
@Injectable({
  providedIn: 'root',
})
export class CartService {
  readonly items = signal<CartItem[]>([]);
  readonly isCartOpen = signal<boolean>(false);
  readonly totalCount = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly totalAmount = computed(() => this.subtotal());
  readonly isEmpty = computed(() => this.items().length === 0);

  private readonly api = inject(PosApiService);
  private readonly branches = inject(StoreBranchService);
  private readonly account = inject(AccountService);
  private readonly toast = inject(AppNotificationService);
  private readonly router = inject(Router);
  private readonly subtotal = signal<number>(0);
  private readonly metaCache = new Map<string, DrinkItem>();

  refresh(): void {
    const branchId = this.branches.branchId();
    if (!branchId) {
      this.items.set([]);
      this.subtotal.set(0);
      return;
    }
    this.api.getCart(branchId).subscribe({
      next: cart => this.applyServerCart(cart.items, cart.subtotalAmount),
      error: err => {
        if (err?.status === 401 || err?.status === 403) {
          this.items.set([]);
          this.subtotal.set(0);
          return;
        }
        console.error('[CartService] refresh', err);
        this.toast.error(err?.error?.message || 'Không tải được giỏ hàng');
      },
    });
  }

  /**
   * Thêm món lên server. Topping gửi tổng cả line (= 1 phần/ly × số ly, đúng A2 BE).
   */
  addItem(drink: DrinkItem, options: CartItemOption = {}, quantity = 1): void {
    const branchId = this.requireBranch();
    if (!branchId || !this.requireCustomer()) return;
    this.metaCache.set(drink.id, { ...drink, imageUrl: normalizeImageUrl(drink.imageUrl) });

    this.api
      .addItem({
        branchId,
        productId: drink.id,
        variantId: options.variantId && options.variantId !== 'default' ? options.variantId : null,
        quantity,
        iceLevel: options.ice || null,
        sugarLevel: options.sugar || null,
        note: options.note?.trim() ? options.note.trim().slice(0, 255) : null,
        toppings: (options.toppings ?? []).map(t => ({ toppingId: t.id, quantity })),
      })
      .subscribe({
        next: () => this.refresh(),
        error: err => {
          console.error('[CartService] addItem', err);
          this.toast.error(err?.error?.message || 'Không thêm được món vào giỏ');
        },
      });
  }

  setQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }
    if (!this.requireCustomer()) return;
    this.api.updateItem(itemId, { quantity }).subscribe({
      next: () => this.refresh(),
      error: err => {
        console.error('[CartService] setQuantity', err);
        this.toast.error(err?.error?.message || 'Không cập nhật được số lượng');
      },
    });
  }

  updateQuantity(itemId: string, delta: number): void {
    const currentItem = this.items().find(item => item.id === itemId);
    if (!currentItem) return;
    this.setQuantity(itemId, currentItem.quantity + delta);
  }

  removeItem(itemId: string): void {
    if (!this.requireCustomer()) return;
    this.api.deleteItem(itemId).subscribe({
      next: () => this.refresh(),
      error: err => {
        console.error('[CartService] removeItem', err);
        this.toast.error(err?.error?.message || 'Không xóa được món');
      },
    });
  }

  clearCart(): void {
    const ids = this.items().map(i => i.id);
    if (!ids.length) return;
    if (!this.requireCustomer()) return;
    from(ids)
      .pipe(
        concatMap(id => this.api.deleteItem(id)),
        toArray(),
        catchError(err => {
          console.error('[CartService] clearCart', err);
          this.toast.error(err?.error?.message || 'Không xóa được giỏ hàng');
          throw err;
        }),
      )
      .subscribe({ next: () => this.refresh(), error: () => this.refresh() });
  }

  openCart(): void {
    this.isCartOpen.set(true);
  }

  closeCart(): void {
    this.isCartOpen.set(false);
  }

  toggleCart(): void {
    this.isCartOpen.update(v => !v);
  }

  /** Branch đang đặt, thiếu thì báo và thôi (BE bắt branchId). */
  private requireBranch(): string | null {
    const branchId = this.branches.branchId();
    if (!branchId) {
      this.toast.warning('Chưa chọn chi nhánh', 'Vui lòng chọn chi nhánh trước khi đặt món.');
      return null;
    }
    return branchId;
  }

  /** BE bắt CUSTOMER JWT. Guest bấm đặt -> chuyển login, không gọi API mù. */
  private requireCustomer(): boolean {
    if (this.account.account()?.principalType === 'CUSTOMER') return true;
    this.toast.warning('Cần đăng nhập', 'Vui lòng đăng nhập tài khoản khách hàng để đặt món.');
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/store/cart' } });
    return false;
  }

  private applyServerCart(items: PosCartItem[], subtotal: number): void {
    const mapped: CartItem[] = (items ?? []).map(i => {
      const cached = this.metaCache.get(i.productId);
      const drink: DrinkItem = cached ?? {
        id: i.productId,
        name: i.productName ?? 'Món',
        category: '',
        categoryName: '',
        price: i.unitPrice,
        imageUrl: DEFAULT_BEVERAGE_IMAGE,
        description: '',
      };
      const toppingLabels = (i.toppings ?? [])
        .map(t => t.toppingName)
        .filter(Boolean)
        .join(', ');
      const parts: string[] = [];
      if (i.variantName) parts.push(i.variantName);
      if (i.sugarLevel) parts.push(`Đường: ${i.sugarLevel}`);
      if (i.iceLevel) parts.push(`Đá: ${i.iceLevel}`);
      if (toppingLabels) parts.push(toppingLabels);
      if (i.note) parts.push(`Ghi chú: ${i.note}`);
      return {
        id: i.cartDetailId,
        drink,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        optionsSummary: parts.join(' • '),
        options: {
          sugar: i.sugarLevel,
          ice: i.iceLevel,
          note: i.note,
          variantId: i.variantId,
          toppings: (i.toppings ?? []).map(t => ({ id: t.toppingId, label: t.toppingName ?? '', price: t.unitPrice })),
        },
        comboItems: i.comboItems,
      };
    });
    this.items.set(mapped);
    this.subtotal.set(subtotal ?? 0);
  }
}
