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
  return balance.availableQuantity <= balance.minStockAlert;
}

export function getStockBalanceMeta(balance: StockBalance): { label: string; badgeClass: string } {
  if (isLowStock(balance)) {
    return { label: 'Sắp hết', badgeClass: 'tbl-badge tbl-badge--warning' };
  }
  return { label: 'Đủ hàng', badgeClass: 'tbl-badge tbl-badge--success' };
}
