import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzInputDirective, NzInputWrapperComponent } from 'ng-zorro-antd/input';

import { CartService } from '../../../shared/services/cart.service';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NzIconDirective, NzInputDirective, NzInputWrapperComponent, AppButtonComponent],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {
  readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  private readonly toast = inject(AppNotificationService);

  readonly items = this.cartService.items;
  readonly totalAmount = this.cartService.totalAmount;
  readonly isEmpty = this.cartService.isEmpty;

  readonly shippingFee = computed(() => (this.totalAmount() >= 99000 || this.isEmpty() ? 0 : 15000));
  readonly discount = computed(() => (this.totalAmount() >= 150000 ? 20000 : 0));
  readonly grandTotal = computed(() => this.totalAmount() + this.shippingFee() - this.discount());

  checkoutForm = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[0-9]{9,11}$/)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    note: new FormControl('', { nonNullable: true }),
    deliveryMethod: new FormControl<'delivery' | 'pickup'>('delivery', { nonNullable: true }),
    paymentMethod: new FormControl<'cod' | 'vnpay' | 'momo'>('cod', { nonNullable: true }),
    agree: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  onSubmit(): void {
    if (this.isEmpty()) {
      this.toast.warning('Giỏ hàng trống', 'Vui lòng thêm món trước khi thanh toán.');
      this.router.navigate(['/store']);
      return;
    }

    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.toast.warning('Vui lòng kiểm tra lại thông tin', 'Điền đầy đủ các trường bắt buộc.');
      return;
    }

    const { fullName, deliveryMethod, paymentMethod } = this.checkoutForm.getRawValue();
    const methodLabel = deliveryMethod === 'delivery' ? 'Giao tận nơi' : 'Tự đến lấy';
    const payLabel = paymentMethod === 'cod' ? 'COD' : paymentMethod === 'vnpay' ? 'VNPay' : 'MoMo';

    this.toast.success(
      `Cảm ơn ${fullName}! Đơn hàng ${this.formatPrice(this.grandTotal())} đã được tiếp nhận.`,
      `${methodLabel} • ${payLabel} • Chúng tôi sẽ liên hệ sớm nhất!`,
    );
    this.cartService.clearCart();
    this.router.navigate(['/store']);
  }
}
export default CheckoutComponent;
