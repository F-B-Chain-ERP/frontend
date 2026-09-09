/** Tồn kho NVL theo kho (map từ StockBalanceResponse của BE). */
export interface StockBalance {
  id: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  warehouseName: string | null;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  minStockAlert: number;
}

export interface StockBalanceFilter {
  warehouseId?: string | null;
  materialId?: string | null;
  query?: string;
  pageIndex: number;
  pageSize: number;
}

export interface StockBalanceListResponse {
  items: StockBalance[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export function isLowStock(balance: StockBalance): boolean {
  const available = Number(balance?.availableQuantity ?? 0);
  const min = Number(balance?.minStockAlert ?? 0);
  return available <= min;
}

export function getStockBalanceMeta(balance: StockBalance): { label: string; badgeClass: string } {
  if (isLowStock(balance)) {
    return { label: 'Sắp hết', badgeClass: 'tbl-badge tbl-badge--warning' };
  }
  return { label: 'Đủ hàng', badgeClass: 'tbl-badge tbl-badge--success' };
}

/**
 * Chuẩn hoá 1 record tồn kho từ BE.
 * BE mới trả `availableQuantity`, BE cũ trả `quantityAvailable`.
 * Hàm này map cả 2 tên + fallback `onHand - reserved` để cột Khả dụng không bao giờ trống.
 */
export function normalizeStockBalance(raw: unknown): StockBalance {
  const r = (raw ?? {}) as Record<string, unknown>;
  const toNum = (v: unknown, fallback = 0): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const onHand = toNum(r['quantityOnHand'], 0);
  const reserved = toNum(r['quantityReserved'], 0);
  const availableRaw = r['availableQuantity'] ?? r['quantityAvailable'] ?? r['available'];
  const available =
    availableRaw === null || availableRaw === undefined || availableRaw === ''
      ? onHand - reserved
      : toNum(availableRaw, onHand - reserved);

  return {
    id: (r['id'] as string | null) ?? null,
    warehouseId: String(r['warehouseId'] ?? ''),
    warehouseCode: (r['warehouseCode'] as string | null) ?? null,
    warehouseName: (r['warehouseName'] as string | null) ?? null,
    materialId: String(r['materialId'] ?? ''),
    materialCode: (r['materialCode'] as string | null) ?? null,
    materialName: (r['materialName'] as string | null) ?? null,
    quantityOnHand: onHand,
    quantityReserved: reserved,
    availableQuantity: available,
    minStockAlert: toNum(r['minStockAlert'], 0),
  };
}
