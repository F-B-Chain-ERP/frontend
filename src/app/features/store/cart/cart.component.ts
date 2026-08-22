import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import {NzIconDirective} from 'ng-zorro-antd/icon';

import {CartService} from '../../../shared/services/cart.service';
import {AppButtonComponent} from '../../../shared/app-button/app-button.component';
import {AppQuantityStepperComponent} from '../../../shared/app-quantity-stepper/app-quantity-stepper.component';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, RouterLink, NzIconDirective, AppButtonComponent, AppQuantityStepperComponent],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPageComponent {
  readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly items = this.cartService.items;
  readonly totalCount = this.cartService.totalCount;
  readonly totalAmount = this.cartService.totalAmount;
  readonly isEmpty = this.cartService.isEmpty;

  // Derived: shipping & discount mock
  readonly shippingFee = computed(() => (this.totalAmount() >= 99000 || this.isEmpty() ? 0 : 15000));
  readonly discount = computed(() => (this.totalAmount() >= 150000 ? 20000 : 0));
  readonly grandTotal = computed(() => this.totalAmount() + this.shippingFee() - this.discount());

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(amount);
  }

  onUpdateQuantity(itemId: string, quantity: number): void {
    this.cartService.setQuantity(itemId, quantity);
  }

  onRemove(itemId: string): void {
    this.cartService.removeItem(itemId);
  }

  onClear(): void {
    this.cartService.clearCart();
  }

  onCheckout(): void {
    if (this.isEmpty()) return;
    this.router.navigate(['/store/checkout']);
  }
}

export default CartPageComponent;
