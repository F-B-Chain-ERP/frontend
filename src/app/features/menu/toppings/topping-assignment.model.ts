// ── Product-Topping Assignment ─────────────────────────────────────────

export interface ProductTopping {
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

export interface AddProductToppingRequest {
  toppingId: string;
  isDefault?: boolean;
  maxQuantity?: number;
}

export interface UpdateProductToppingRequest {
  isDefault?: boolean;
  maxQuantity?: number;
}

// Product selector
export interface ProductItem {
  id: string;
  code: string;
  name: string;
  basePrice: number;
  categoryName: string;
  imageUrl: string | null;
  status: string;
}

export interface ProductFilter {
  search?: string;
  status?: string;
  page: number;
  size: number;
}

export interface ProductListResponse {
  items: ProductItem[];
  total: number;
}

// Topping selector
export interface ToppingItem {
  id: string;
  code: string;
  name: string;
  price: number;
  groupName: string | null;
  status: string;
}
