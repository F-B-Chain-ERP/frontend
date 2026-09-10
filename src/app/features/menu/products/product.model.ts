// ── Product (sản phẩm thực đơn) ──────────────────────────────────

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId: string;
  categoryName?: string | null;
  basePrice: number;
  preparationMinutes: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isCombo: boolean;
  availableIceLevels: string;
  availableSugarLevels: string;
  status: string;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export * from './variants/variant.model';
import {ProductVariant} from './variants/variant.model';

export interface ProductDetail extends Product {
  variants: ProductVariant[];
}

export interface ProductFilter {
  query?: string;
  categoryId?: string | null;
  status?: string | null;
  isFeatured?: boolean | null;
  isBestSeller?: boolean | null;
  pageIndex: number;
  pageSize: number;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

/** Dữ liệu form tạo/sửa sản phẩm — hỗ trợ cả upload file lẫn imageUrl trực tiếp */
export interface CreateProductFormData {
  categoryId: string;
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  basePrice: number;
  preparationMinutes?: number | null;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isCombo?: boolean;
  availableIceLevels?: string | null;
  availableSugarLevels?: string | null;
  status?: string | null;
  /** File ảnh tuỳ chọn khi tải lên từ máy tính */
  image?: File | null;
}

export interface UpdateProductFormData extends CreateProductFormData {
  id: string;
}

/** DTO payload khi gửi JSON API trực tiếp */
export interface CreateProductRequestDto {
  categoryId: string;
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  basePrice: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isCombo?: boolean;
}

/** DTO payload cập nhật sản phẩm khi gửi JSON API trực tiếp */
export interface UpdateProductRequestDto {
  categoryId: string;
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  basePrice: number;
  preparationMinutes?: number | null;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isCombo?: boolean;
  availableIceLevels?: string | null;
  availableSugarLevels?: string | null;
  status?: string | null;
}

/** Phản hồi tóm tắt sau khi tạo sản phẩm thành công (HTTP 201) */
export interface CreateProductResponse {
  id: string;
  code: string;
  name: string;
  basePrice: number;
  status: string;
}

export const PRODUCT_STATUS_OPTIONS = [
  {value: 'ACTIVE', label: 'Đang bán', badgeClass: 'tbl-badge--success'},
  {value: 'INACTIVE', label: 'Ngừng bán', badgeClass: 'tbl-badge--danger'},
];

export function getProductStatusMeta(status: string): { label: string; badgeClass: string } {
  const s = String(status || '').toUpperCase();
  if (s === 'ACTIVE') {
    return {label: 'Đang bán', badgeClass: 'tbl-badge tbl-badge--success'};
  }
  if (s === 'DELETED') {
    return {label: 'Đã xóa', badgeClass: 'tbl-badge tbl-badge--default'};
  }
  return {label: 'Ngừng bán', badgeClass: 'tbl-badge tbl-badge--danger'};
}

