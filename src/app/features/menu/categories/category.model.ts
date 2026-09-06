// ── Category (danh mục, master dùng chung INV + MENU) ───────────────────

export interface Category {
  id: string;
  categoryType: string;
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  status: string;
  usedCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryFilter {
  query?: string;
  categoryType?: string | null;
  status?: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface CreateCategoryRequest {
  categoryType: string;
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder?: number | null;
}

export interface UpdateCategoryRequest {
  categoryType: string;
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder?: number | null;
}

export interface CategoryListResponse {
  items: Category[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const CATEGORY_TYPE_OPTIONS = [
  { value: 'PRODUCT', label: 'Món bán' },
  { value: 'MATERIAL', label: 'Nguyên vật liệu' },
];

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  PRODUCT: 'Món bán',
  MATERIAL: 'Nguyên vật liệu',
};

export function getCategoryTypeLabel(categoryType: string): string {
  return CATEGORY_TYPE_LABELS[String(categoryType || '').toUpperCase()] ?? categoryType ?? '—';
}

export const CATEGORY_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang sử dụng', badgeClass: 'tbl-badge--success' },
  { value: 'INACTIVE', label: 'Ngừng sử dụng', badgeClass: 'tbl-badge--danger' },
];

export function getCategoryStatusMeta(status: string): { label: string; badgeClass: string } {
  if (String(status || '').toUpperCase() === 'ACTIVE') {
    return { label: 'Đang sử dụng', badgeClass: 'tbl-badge tbl-badge--success' };
  }
  return { label: 'Ngừng sử dụng', badgeClass: 'tbl-badge tbl-badge--danger' };
}
