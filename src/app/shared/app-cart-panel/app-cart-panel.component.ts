import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { AppButtonComponent } from '../app-button/app-button.component';
import { AppQuantityStepperComponent } from '../app-quantity-stepper/app-quantity-stepper.component';
import { CartService, CartItem } from '../services/cart.service';
import { AppNotificationService } from '../app-notification/app-notification.service';

@Component({
  selector: 'app-cart-panel',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzTooltipModule, AppButtonComponent, AppQuantityStepperComponent],
  templateUrl: './app-cart-panel.component.html',
  styleUrls: ['./app-cart-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppCartPanelComponent {
  readonly cartService = inject(CartService);
  private readonly toast = inject(AppNotificationService);

  @Output() checkout = new EventEmitter<CartItem[]>();

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  onClose(): void {
    this.cartService.closeCart();
  }

  onQuantityChange(itemId: string, newQty: number): void {
    this.cartService.setQuantity(itemId, newQty);
  }

  onRemoveItem(itemId: string, itemName: string): void {
    this.cartService.removeItem(itemId);
    this.toast.info(`Đã xóa món "${itemName}" khỏi giỏ hàng`);
  }

  onClearCart(): void {
    this.cartService.clearCart();
    this.toast.info('Đã làm trống giỏ hàng');
  }

  onCheckout(): void {
    const items = this.cartService.items();
    if (!items.length) {
      this.toast.warning('Giỏ hàng chưa có sản phẩm nào để thanh toán!');
      return;
    }

    this.checkout.emit(items);
    this.toast.success(
      'Đặt hàng thành công!',
      `Đơn hàng gồm ${this.cartService.totalCount()} món (${this.formatPrice(this.cartService.totalAmount())}) đã được gửi vào hệ thống.`
    );
    this.cartService.clearCart();
    this.cartService.closeCart();
  }
}
export default AppCartPanelComponent;
