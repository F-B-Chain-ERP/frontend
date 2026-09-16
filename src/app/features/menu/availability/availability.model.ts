// ── Branch Product/Topping Availability ──────────────────────────────

export interface BranchProductAvailability {
  id: string;
  branchId: string;
  productId: string;
  productCode: string;
  productName: string;
  basePrice: number;
  categoryName: string;
  salePrice: number | null;
  isAvailable: boolean;
  status: string;
}

export interface BranchToppingAvailability {
  id: string;
  branchId: string;
  toppingId: string;
  toppingCode: string;
  toppingName: string;
  toppingPrice: number;
  groupName: string;
  isAvailable: boolean;
  status: string;
}

export interface UpdateAvailabilityRequest {
  isAvailable: boolean;
  salePrice?: number | null;
  clearPrice?: boolean;
}

export interface AvailabilityPageResponse<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}
