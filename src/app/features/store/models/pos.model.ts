export interface PosCartToppingRequest {
  toppingId: string;
  quantity: number;
}

export interface AddPosCartItemRequest {
  branchId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  iceLevel?: string | null;
  sugarLevel?: string | null;
  note?: string | null;
  toppings?: PosCartToppingRequest[] | null;
}

export interface UpdatePosCartItemRequest {
  quantity?: number | null;
  iceLevel?: string | null;
  sugarLevel?: string | null;
  note?: string | null;
}

export interface PosCartItemTopping {
  toppingId: string;
  toppingName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PosCartItem {
  /** BE đặt tên cartDetailId (không phải id) — đọc sai là mọi PUT/DELETE thành /undefined. */
  cartDetailId: string;
  productId: string;
  productCode: string | null;
  productName: string | null;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  iceLevel: string;
  sugarLevel: string;
  note: string | null;
  unitPrice: number;
  totalPrice: number;
  toppings: PosCartItemTopping[];
}

export interface PosCart {
  cartId: string | null;
  branchId: string;
  subtotalAmount: number;
  items: PosCartItem[];
}

export interface CreatePosOrderRequest {
  branchId: string;
  orderType: 'PICKUP' | 'DELIVERY';
  voucherCode?: string | null;
  receiverName: string;
  receiverPhone: string;
  shippingAddress?: string | null;
  paymentMethod: 'CASH' | 'COD' | 'VNPAY' | 'MOMO' | 'BANK_TRANSFER';
  note?: string | null;
  pickupTimeSlotId?: string | null;
}

export interface PosOrder {
  id: string;
  orderCode: string;
  branchId: string;
  orderType: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  /** Khớp tên field BE (subtotal/discount/shippingFee, KHÔNG phải *Amount). */
  subtotal: number;
  discount: number;
  shippingFee: number;
  totalAmount: number;
  createdAt: string | null;
}

export interface PosOrderItemDetail {
  id: string;
  productCode: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  iceLevel: string;
  sugarLevel: string;
  note: string | null;
  unitPrice: number;
  /** BE đặt tên amount. */
  amount: number;
  /** Ảnh hiện tại của SP do BE resolve lúc đọc. */
  productImageUrl: string | null;
  toppings: PosCartItemTopping[];
}

export interface PosOrderDetail extends PosOrder {
  customerName: string;
  customerPhone: string;
  /** BE map deliveryAddress entity vào key shippingAddress. */
  shippingAddress: string | null;
  note: string | null;
  createdAt: string | null;
  items: PosOrderItemDetail[];
}

export interface PosOrderHistoryItem {
  id: string;
  orderId: string;
  oldStatus: string | null;
  newStatus: string;
  changedAt: string;
  /** BE map reason entity vào key note. */
  note: string | null;
}

export interface SalesBranch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  supportsPickup: boolean;
  supportsDelivery: boolean;
}

export interface SalesProductTopping {
  id: string;
  productId: string;
  toppingId: string;
  toppingCode: string;
  toppingName: string;
  toppingPrice: number;
  groupName: string | null;
  isDefault: boolean;
  maxQuantity: number;
  status: string;
}

export interface CustomerProfile {
  id: string;
  customerCode: string;
  username: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  status: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
}
