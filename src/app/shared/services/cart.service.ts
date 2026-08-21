import { Injectable, computed, signal } from '@angular/core';
import { DrinkItem } from '../app-drink-card/app-drink-card.component';

export interface CartItemOption {
  size?: string;
  sizeExtra?: number;
  sugar?: string;
  ice?: string;
  toppings?: Array<{ id: string; label: string; price: number }>;
}

export interface CartItem {
  id: string;
  drink: DrinkItem;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  optionsSummary: string;
  options: CartItemOption;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly itemsSignal = signal<CartItem[]>([]);
  private readonly isCartOpenSignal = signal<boolean>(false);

  readonly items = this.itemsSignal.asReadonly();
  readonly isCartOpen = this.isCartOpenSignal.asReadonly();

  readonly totalCount = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly totalAmount = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.totalPrice, 0)
  );

  readonly isEmpty = computed(() => this.itemsSignal().length === 0);

  /**
   * Add drink with customized options to cart
   */
  addItem(
    drink: DrinkItem,
    options: CartItemOption = {},
    quantity = 1
  ): CartItem {
    let unitPrice = drink.price;
    if (options.sizeExtra) {
      unitPrice += options.sizeExtra;
    }
    if (options.toppings && options.toppings.length > 0) {
      unitPrice += options.toppings.reduce((acc, t) => acc + t.price, 0);
    }

    const summaryParts: string[] = [];
    if (options.size) summaryParts.push(`Size ${options.size}`);
    if (options.sugar) summaryParts.push(`Đường: ${options.sugar}`);
    if (options.ice) summaryParts.push(`Đá: ${options.ice}`);
    if (options.toppings && options.toppings.length > 0) {
      summaryParts.push(options.toppings.map(t => t.label).join(', '));
    }
    const optionsSummary = summaryParts.join(' • ');

    // Unique ID based on drink ID + serialized options
    const optionKey = `${options.size || ''}-${options.sugar || ''}-${options.ice || ''}-${(options.toppings || []).map(t => t.id).sort().join(',')}`;
    const cartItemId = `${drink.id}::${optionKey}`;

    let resultingItem: CartItem | null = null;

    this.itemsSignal.update(items => {
      const existingIndex = items.findIndex(item => item.id === cartItemId);
      if (existingIndex > -1) {
        const existing = items[existingIndex];
        const updatedQty = existing.quantity + quantity;
        const updatedItem: CartItem = {
          ...existing,
          quantity: updatedQty,
          totalPrice: updatedQty * existing.unitPrice,
        };
        resultingItem = updatedItem;
        const newItems = [...items];
        newItems[existingIndex] = updatedItem;
        return newItems;
      } else {
        const newItem: CartItem = {
          id: cartItemId,
          drink,
          quantity,
          unitPrice,
          totalPrice: quantity * unitPrice,
          optionsSummary,
          options,
        };
        resultingItem = newItem;
        return [...items, newItem];
      }
    });

    return resultingItem!;
  }

  /**
   * Set exact quantity for an item
   */
  setQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }

    this.itemsSignal.update(items =>
      items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity,
            totalPrice: quantity * item.unitPrice,
          };
        }
        return item;
      })
    );
  }

  /**
   * Update quantity by delta (+1 / -1)
   */
  updateQuantity(itemId: string, delta: number): void {
    const currentItem = this.itemsSignal().find(item => item.id === itemId);
    if (!currentItem) return;

    const newQty = currentItem.quantity + delta;
    this.setQuantity(itemId, newQty);
  }

  /**
   * Remove item from cart
   */
  removeItem(itemId: string): void {
    this.itemsSignal.update(items => items.filter(item => item.id !== itemId));
  }

  /**
   * Clear all items in cart
   */
  clearCart(): void {
    this.itemsSignal.set([]);
  }

  /**
   * Drawer toggle controls
   */
  openCart(): void {
    this.isCartOpenSignal.set(true);
  }

  closeCart(): void {
    this.isCartOpenSignal.set(false);
  }

  toggleCart(): void {
    this.isCartOpenSignal.update(v => !v);
  }
}
