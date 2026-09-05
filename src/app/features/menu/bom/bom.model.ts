export interface RecipeItem {
  id: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantity: number;
  unitCost: number; // Đơn giá vốn trên 1 đơn vị NVL
  totalCost: number; // quantity * unitCost
}

export interface ProductBOM {
  id: string;
  productCode: string;
  productName: string;
  categoryName: string;
  variantName: string; // Size M / Size L / Tiêu chuẩn
  sellingPrice: number; // Giá bán niêm yết
  foodCost: number; // Tổng giá vốn cấu thành từ NVL
  foodCostPercentage: number; // (foodCost / sellingPrice) * 100
  recipeItems: RecipeItem[];
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt: string;
}

export interface BOMFilter {
  query?: string;
  categoryId?: string;
  status?: string;
}
