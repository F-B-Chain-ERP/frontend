// ── Supplier Material (quan hệ Nhà cung cấp - Nguyên vật liệu) ──────────────

export interface SupplierMaterial {
  id: string;
  supplierId: string;
  supplierName?: string;
  materialId: string;
  materialName?: string;
  unitName?: string | null;
  supplierSku?: string | null;
  purchasePrice: number;
  leadTimeDays?: number | null;
  isPreferred: boolean;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierMaterialFilter {
  query?: string;
  pageIndex: number;
  pageSize: number;
}

export interface CreateSupplierMaterialRequest {
  supplierId: string;
  materialId: string;
  supplierSku?: string | null;
  purchasePrice: number;
  leadTimeDays?: number | null;
  isPreferred?: boolean;
  status?: string | null;
}

export interface UpdateSupplierMaterialRequest {
  supplierId: string;
  materialId: string;
  supplierSku?: string | null;
  purchasePrice: number;
  leadTimeDays?: number | null;
  isPreferred?: boolean;
  status?: string | null;
}

export interface SupplierMaterialListResponse {
  items: SupplierMaterial[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const SUPPLIER_MATERIAL_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang áp dụng', badgeClass: 'tbl-badge--success' },
  { value: 'INACTIVE', label: 'Ngừng áp dụng', badgeClass: 'tbl-badge--danger' },
];

export function getSupplierMaterialStatusMeta(status: string): { label: string; badgeClass: string } {
  if (status === 'ACTIVE') {
    return { label: 'Đang áp dụng', badgeClass: 'tbl-badge tbl-badge--success' };
  }
  return { label: 'Ngừng áp dụng', badgeClass: 'tbl-badge tbl-badge--danger' };
}

// ── Material master (dùng cho dropdown "Nguyên vật liệu") ───────────────────

export interface Material {
  id: string;
  code: string;
  name: string;
  categoryId?: string | null;
  baseUnitId?: string | null;
  status: string;
}

export interface MaterialListResponse {
  items: Material[];
  total: number;
}
