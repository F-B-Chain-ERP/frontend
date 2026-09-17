import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NzIconDirective } from 'ng-zorro-antd/icon';

import { CartService } from '../../../shared/services/cart.service';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppQuantityStepperComponent } from '../../../shared/app-quantity-stepper/app-quantity-stepper.component';
import { normalizeImageUrl, DEFAULT_BEVERAGE_IMAGE } from '../../../core/util/image.util';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, RouterLink, NzIconDirective, AppButtonComponent, AppQuantityStepperComponent],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPageComponent implements OnInit {
  readonly cartService = inject(CartService);
  readonly normalizeImageUrl = normalizeImageUrl;
  readonly fallbackImage = DEFAULT_BEVERAGE_IMAGE;
  readonly items = this.cartService.items;
  readonly totalCount = this.cartService.totalCount;
  readonly totalAmount = this.cartService.totalAmount;
  readonly isEmpty = this.cartService.isEmpty;

  private readonly router = inject(Router);

  ngOnInit(): void {
    this.cartService.refresh();
  }

  // Phí ship/giảm giá do BE tính lúc tạo đơn (ship 15k nếu DELIVERY, giảm giá chỉ từ voucher).
  // Trang giỏ chỉ hiện tạm tính, không mock số như trước.

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (target && target.src !== this.fallbackImage) {
      target.src = this.fallbackImage;
    }
  }
}

export default CartPageComponent;
