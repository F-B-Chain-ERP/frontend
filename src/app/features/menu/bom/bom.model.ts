/**
 * Model biểu diễn một dòng nguyên vật liệu trong công thức định lượng (BOM).
 */
export interface ProductRecipeItemResponse {
  id: string;
  variantId: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  quantity: number;
  unitId: string;
  unitCode: string;
  wastagePercent: number;
  status: string;
}

/**
 * Model công thức định lượng đầy đủ của một biến thể đồ uống.
 */
export interface BomResponse {
  variantId: string;
  variantName: string;
  items: ProductRecipeItemResponse[];
}

/**
 * Model tổng quan hiển thị trên bảng danh sách BOM.
 */
export interface ProductBomOverview {
  variantId: string;
  variantCode: string;
  variantName: string;
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  sellingPrice: number;
  itemCount: number;
  status: string;
  updatedAt: string;
}

/**
 * Request payload thêm nguyên vật liệu vào BOM.
 */
export interface AddBomItemRequest {
  materialId: string;
  quantity: number;
  unitId: string;
  wastagePercent: number;
}

/**
 * Request payload cập nhật dòng BOM.
 */
export interface UpdateBomItemRequest {
  materialId: string;
  quantity: number;
  unitId: string;
  wastagePercent: number;
}

/**
 * Request payload đồng bộ toàn bộ BOM.
 */
export interface BulkSyncBomRequest {
  items: Array<{
    id?: string | null;
    materialId: string;
    quantity: number;
    unitId: string;
    wastagePercent: number;
  }>;
}

/**
 * Bộ lọc danh sách BOM.
 */
export interface BOMFilter {
  query?: string;
  categoryId?: string;
  status?: string;
}

/**
 * Legacy interfaces phục vụ mock service hoặc tương thích ngược.
 */
export interface RecipeItem {
  id: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface ProductBOM {
  id: string;
  productCode: string;
  productName: string;
  categoryName: string;
  variantName: string;
  sellingPrice: number;
  foodCost: number;
  foodCostPercentage: number;
  recipeItems: RecipeItem[];
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt: string;
}

