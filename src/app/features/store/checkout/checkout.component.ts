import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzInputDirective, NzInputWrapperComponent } from 'ng-zorro-antd/input';

import { CartService } from '../../../shared/services/cart.service';
import { AccountService } from '../../../core/auth/account.service';
import { AppButtonComponent } from '../../../shared/app-button/app-button.component';
import { AppNotificationService } from '../../../shared/app-notification/app-notification.service';
import { normalizeImageUrl, DEFAULT_BEVERAGE_IMAGE } from '../../../core/util/image.util';
import { PosApiService } from '../services/pos-api.service';
import { PosOrder } from '../models/pos.model';
import { StoreBranchService } from '../services/store-branch.service';
import { PickupSlotService } from '../../system/pickup-slots/pickup-slot.service';
import { PickupTimeSlot } from '../../system/pickup-slots/pickup-slot.model';

const DELIVERY_FEE = 15000;

function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NzIconDirective, NzInputDirective, NzInputWrapperComponent, AppButtonComponent],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  readonly cartService = inject(CartService);
  readonly normalizeImageUrl = normalizeImageUrl;
  readonly fallbackImage = DEFAULT_BEVERAGE_IMAGE;
  readonly items = this.cartService.items;
  readonly totalAmount = this.cartService.totalAmount;
  readonly isEmpty = this.cartService.isEmpty;
  readonly deliveryMethod = signal<'delivery' | 'pickup'>('delivery');
  readonly isSubmitting = signal<boolean>(false);
  readonly successOrder = signal<PosOrder | null>(null);
  readonly shippingFee = computed(() => (this.deliveryMethod() === 'delivery' && !this.isEmpty() ? DELIVERY_FEE : 0));
  readonly grandTotal = computed(() => this.totalAmount() + this.shippingFee());
  checkoutForm = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]{9,11}$/)],
    }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    note: new FormControl('', { nonNullable: true }),
    voucherCode: new FormControl('', { nonNullable: true }),
    agree: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  private readonly router = inject(Router);
  private readonly toast = inject(AppNotificationService);
  private readonly posApi = inject(PosApiService);
  private readonly branches = inject(StoreBranchService);
  private readonly account = inject(AccountService);
  private readonly pickupSlotService = inject(PickupSlotService);

  readonly availablePickupSlots = signal<PickupTimeSlot[]>([]);
  readonly isLoadingPickupSlots = signal<boolean>(false);
  readonly selectedPickupSlotId = signal<string | null>(null);

  /** 1 key cho cả phiên checkout: lỗi mạng bấm lại không trùng đơn, thành công mới đổi key. */
  private idempotencyKey = newIdempotencyKey();

  branchName = (): string => this.branches.currentBranch()?.name ?? '';

  ngOnInit(): void {
    this.cartService.refresh();
    this.branches.loadBranches().subscribe({
      next: () => {
        const bId = this.branches.branchId();
        if (this.deliveryMethod() === 'pickup' && bId) {
          this.loadPickupSlots(bId);
        }
      },
    });
    this.syncAddressValidators(this.deliveryMethod());
  }

  onDeliveryMethodChange(method: 'delivery' | 'pickup'): void {
    this.deliveryMethod.set(method);
    this.syncAddressValidators(method);
    const bId = this.branches.branchId();
    if (method === 'pickup' && bId) {
      this.loadPickupSlots(bId);
    }
  }

  loadPickupSlots(branchId: string | null | undefined): void {
    if (!branchId) return;
    this.isLoadingPickupSlots.set(true);
    this.pickupSlotService.getPublicSlots(branchId).subscribe({
      next: slots => {
        this.isLoadingPickupSlots.set(false);
        this.availablePickupSlots.set(slots);
        const firstAvailable = slots.find(s => s.isAvailable);
        if (firstAvailable && !this.selectedPickupSlotId()) {
          this.selectedPickupSlotId.set(firstAvailable.id);
        }
      },
      error: () => {
        this.isLoadingPickupSlots.set(false);
        this.availablePickupSlots.set([]);
      },
    });
  }

  selectPickupSlot(slotId: string): void {
    this.selectedPickupSlotId.set(slotId);
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  onSubmit(): void {
    if (this.isEmpty()) {
      this.toast.warning('Giỏ hàng trống', 'Vui lòng thêm món trước khi thanh toán.');
      this.router.navigate(['/store']);
      return;
    }
    if (!this.requireCustomer()) return;

    const branchId = this.branches.branchId();
    if (!branchId) {
      this.toast.warning('Chưa chọn chi nhánh', 'Vui lòng chọn chi nhánh trước khi đặt món.');
      this.router.navigate(['/store']);
      return;
    }

    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.toast.warning('Vui lòng kiểm tra lại thông tin', 'Điền đầy đủ các trường bắt buộc.');
      return;
    }
    if (this.isSubmitting()) return;

    const raw = this.checkoutForm.getRawValue();
    const isDelivery = this.deliveryMethod() === 'delivery';
    this.isSubmitting.set(true);
    this.posApi
      .createOrder(
        {
          branchId,
          orderType: isDelivery ? 'DELIVERY' : 'PICKUP',
          voucherCode: raw.voucherCode.trim() ? raw.voucherCode.trim() : null,
          receiverName: raw.fullName.trim(),
          receiverPhone: raw.phone.trim(),
          shippingAddress: isDelivery ? raw.address.trim() : null,
          // Online (VNPay/MoMo) chưa triển khai: delivery thu COD, pickup trả CASH tại quầy.
          // TODO [VNPay Sprint]: Thêm option VNPAY/MOMO, sau đó cần mở POST /{id}/payment cho CUSTOMER.
          paymentMethod: isDelivery ? 'COD' : 'CASH',
          note: raw.note.trim() ? raw.note.trim().slice(0, 500) : null,
          pickupTimeSlotId: !isDelivery ? this.selectedPickupSlotId() : null,
        },
        this.idempotencyKey,
      )
      .subscribe({
        next: order => {
          this.isSubmitting.set(false);
          this.successOrder.set(order);
          this.idempotencyKey = newIdempotencyKey();
          this.cartService.refresh();
          this.toast.success(
            `Đặt món thành công! Mã đơn ${order.orderCode}`,
            `Tổng thanh toán ${this.formatPrice(order.totalAmount)} • ${isDelivery ? 'Thu COD khi nhận món' : 'Trả tiền mặt tại quầy'}.`,
          );
        },
        error: err => {
          this.isSubmitting.set(false);
          this.toast.error(err?.error?.message || 'Không tạo được đơn hàng, vui lòng thử lại.');
        },
      });
  }

  backToStore(): void {
    this.successOrder.set(null);
    this.router.navigate(['/store']);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (target && target.src !== this.fallbackImage) {
      target.src = this.fallbackImage;
    }
  }

  private syncAddressValidators(method: 'delivery' | 'pickup'): void {
    const address = this.checkoutForm.get('address');
    if (!address) return;
    if (method === 'delivery') {
      address.setValidators([Validators.required, Validators.minLength(6)]);
    } else {
      address.clearValidators();
    }
    address.updateValueAndValidity();
  }

  /** BE bắt CUSTOMER JWT. Guest bấm đặt -> chuyển login, không gọi API mù. */
  private requireCustomer(): boolean {
    if (this.account.account()?.principalType === 'CUSTOMER') return true;
    this.toast.warning('Cần đăng nhập', 'Vui lòng đăng nhập tài khoản khách hàng để đặt món.');
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/store/checkout' } });
    return false;
  }
}

export default CheckoutComponent;
