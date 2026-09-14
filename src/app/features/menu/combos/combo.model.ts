// ── Combo (Combo sản phẩm) ──────────────────────────────────

export interface Combo {
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

export interface ComboItem {
  comboItemId: string;
  variantId: string;
  variantCode: string;
  variantName: string;
  sizeLabel: string;
  productCode: string;
  productName: string;
  variantPrice: number;
  quantity: number;
  isSubstitutable: boolean;
  status: string;
  lineTotal: number;
}

export interface ComboDetail {
  comboProductId: string;
  code: string;
  name: string;
  basePrice: number;
  calculatedPrice: number;
  isCombo: boolean;
  status: string;
  items: ComboItem[];
}

export interface ComboFilter {
  query?: string;
  categoryId?: string | null;
  status?: string | null;
  sortBy?: string;
  sortDirection?: string;
  pageIndex: number;
  pageSize: number;
}

export interface ComboListResponse {
  items: Combo[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

// ── Request DTOs ──────────────────────────────────

export interface AddComboItemRequestDto {
  variantId: string;
  quantity: number;
  isSubstitutable: boolean;
}

export interface CalculateComboPriceRequestDto {
  comboProductId: string;
  originalComboPrice: number;
  items: ComboItemSwapDto[];
}

export interface ComboItemSwapDto {
  originalComboItemId: string;
  newVariantId: string;
  quantity: number;
}

export interface CalculateComboPriceResponseDto {
  originalComboPrice: number;
  adjustedComboPrice: number;
  details: ComboItemPriceDetailDto[];
}

export interface ComboItemPriceDetailDto {
  comboItemId: string;
  originalVariantId: string;
  newVariantId: string;
  originalLineTotal: number;
  adjustedLineTotal: number;
  priceDifference: number;
}

// ── Product variant (dùng khi chọn variant cho combo item) ──

export interface ProductVariantOption {
  id: string;
  variantCode: string;
  variantName: string;
  sizeLabel: string;
  priceDelta: number;
  displayOrder: number;
  status?: string;
}

// ── Status helpers ──────────────────────────────────

export const COMBO_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang bán', badgeClass: 'tbl-badge--success' },
  { value: 'INACTIVE', label: 'Ngừng bán', badgeClass: 'tbl-badge--danger' },
];

export function getComboStatusMeta(status: string): { label: string; badgeClass: string } {
  const s = String(status || '').toUpperCase();
  if (s === 'ACTIVE') {
    return { label: 'Đang bán', badgeClass: 'tbl-badge tbl-badge--success' };
  }
  if (s === 'DELETED') {
    return { label: 'Đã xóa', badgeClass: 'tbl-badge tbl-badge--default' };
  }
  return { label: 'Ngừng bán', badgeClass: 'tbl-badge tbl-badge--danger' };
}
