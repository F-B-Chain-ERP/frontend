import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ApiResponse } from '../../login/login.model';

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

/**
 * Client gọi API thật của 3 module cart/order (kênh bán hàng):
 * - GET/POST/PUT/DELETE /api/v1/pos/cart
 * - POST /api/v1/pos/orders (kèm header Idempotency-Key chống trùng đơn)
 * - GET /api/v1/sales/branches, /api/v1/sales/products/{id}/toppings
 * JWT khách (CUSTOMER) do auth.interceptor tự gắn.
 */
@Injectable({
  providedIn: 'root',
})
export class PosApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApplicationConfigService);

  getCart(branchId: string): Observable<PosCart> {
    const params = new HttpParams().set('branchId', branchId);
    return this.http.get<ApiResponse<PosCart>>(this.posUrl('/cart'), { params }).pipe(map(res => res.data));
  }

  /** Thêm món -> caller tự refresh() để lấy truth từ server (giá/tồn do BE tính). */
  addItem(request: AddPosCartItemRequest): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(this.posUrl('/cart/items'), request);
  }

  updateItem(itemId: string, request: UpdatePosCartItemRequest): Observable<unknown> {
    return this.http.put<ApiResponse<unknown>>(this.posUrl(`/cart/items/${itemId}`), request);
  }

  deleteItem(itemId: string): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(this.posUrl(`/cart/items/${itemId}`));
  }

  createOrder(request: CreatePosOrderRequest, idempotencyKey: string): Observable<PosOrder> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<ApiResponse<PosOrder>>(this.posUrl('/orders'), request, { headers }).pipe(map(res => res.data));
  }

  /** Đơn của tôi (BE tự lọc theo CUSTOMER login, phân trang 0-based). */
  listMyOrders(page = 1, size = 10, status?: string | null): Observable<{ items: PosOrder[]; total: number }> {
    let params = new HttpParams().set('page', String(Math.max(page - 1, 0))).set('size', String(size));
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse<{ content: PosOrder[]; totalElements: number }>>(this.posUrl('/orders'), { params }).pipe(
      map(res => ({ items: res.data?.content ?? [], total: res.data?.totalElements ?? 0 })),
    );
  }

  getMyOrder(id: string): Observable<PosOrderDetail> {
    return this.http.get<ApiResponse<PosOrderDetail>>(this.posUrl(`/orders/${id}`)).pipe(map(res => res.data));
  }

  getMyOrderHistory(id: string): Observable<PosOrderHistoryItem[]> {
    return this.http.get<ApiResponse<PosOrderHistoryItem[]>>(this.posUrl(`/orders/${id}/history`)).pipe(map(res => res.data ?? []));
  }

  cancelMyOrder(id: string, reason: string): Observable<unknown> {
    return this.http.post(this.posUrl(`/orders/${id}/cancel`), { reason });
  }

  getSalesBranches(): Observable<SalesBranch[]> {
    return this.http.get<ApiResponse<SalesBranch[]>>(this.salesUrl('/branches')).pipe(map(res => res.data ?? []));
  }

  getProductToppings(productId: string, branchId?: string | null): Observable<SalesProductTopping[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId);
    return this.http
      .get<ApiResponse<SalesProductTopping[]>>(this.salesUrl(`/products/${productId}/toppings`), { params })
      .pipe(map(res => res.data ?? []));
  }

  private posUrl(path: string): string {
    return this.config.getEndpointFor(`api/v1/pos${path}`);
  }

  private salesUrl(path: string): string {
    return this.config.getEndpointFor(`api/v1/sales${path}`);
  }
}
