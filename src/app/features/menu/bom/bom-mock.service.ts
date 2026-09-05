import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ProductBOM, BOMFilter, RecipeItem } from './bom.model';

@Injectable({
  providedIn: 'root',
})
export class BomMockService {
  private bomList: ProductBOM[] = [
    {
      id: 'bom-001',
      productCode: 'DRK-OL-M',
      productName: 'Trà Sữa Oolong Nướng',
      categoryName: 'Trà Sữa Truyền Thống',
      variantName: 'Size M (500ml)',
      sellingPrice: 38000,
      foodCost: 10450,
      foodCostPercentage: 27.5,
      status: 'ACTIVE',
      updatedAt: '04/09/2026 09:15',
      recipeItems: [
        { id: 'r-1', materialCode: 'MAT-TEA-01', materialName: 'Nước cốt Trà Oolong Nướng', unit: 'ml', quantity: 150, unitCost: 35, totalCost: 5250 },
        { id: 'r-2', materialCode: 'MAT-MILK-02', materialName: 'Bột sữa béo thực vật Frima', unit: 'g', quantity: 35, unitCost: 70, totalCost: 2450 },
        { id: 'r-3', materialCode: 'MAT-SUG-01', materialName: 'Nước đường mía nấu hoa quả', unit: 'ml', quantity: 20, unitCost: 25, totalCost: 500 },
        { id: 'r-4', materialCode: 'MAT-ICE-01', materialName: 'Đá viên tinh khiết', unit: 'g', quantity: 200, unitCost: 2, totalCost: 400 },
        { id: 'r-5', materialCode: 'MAT-PKG-01', materialName: 'Vỏ ly nhựa PP 500ml', unit: 'cái', quantity: 1, unitCost: 850, totalCost: 850 },
        { id: 'r-6', materialCode: 'MAT-PKG-02', materialName: 'Màng ép nắp ly dập nhiệt', unit: 'cái', quantity: 1, unitCost: 300, totalCost: 300 },
        { id: 'r-7', materialCode: 'MAT-PKG-03', materialName: 'Ống hút giấy bọc màng', unit: 'cái', quantity: 1, unitCost: 700, totalCost: 700 },
      ],
    },
    {
      id: 'bom-002',
      productCode: 'DRK-OL-L',
      productName: 'Trà Sữa Oolong Nướng',
      categoryName: 'Trà Sữa Truyền Thống',
      variantName: 'Size L (700ml)',
      sellingPrice: 48000,
      foodCost: 13950,
      foodCostPercentage: 29.1,
      status: 'ACTIVE',
      updatedAt: '04/09/2026 09:20',
      recipeItems: [
        { id: 'r-8', materialCode: 'MAT-TEA-01', materialName: 'Nước cốt Trà Oolong Nướng', unit: 'ml', quantity: 220, unitCost: 35, totalCost: 7700 },
        { id: 'r-9', materialCode: 'MAT-MILK-02', materialName: 'Bột sữa béo thực vật Frima', unit: 'g', quantity: 45, unitCost: 70, totalCost: 3150 },
        { id: 'r-10', materialCode: 'MAT-SUG-01', materialName: 'Nước đường mía nấu hoa quả', unit: 'ml', quantity: 30, unitCost: 25, totalCost: 750 },
        { id: 'r-11', materialCode: 'MAT-ICE-01', materialName: 'Đá viên tinh khiết', unit: 'g', quantity: 250, unitCost: 2, totalCost: 500 },
        { id: 'r-12', materialCode: 'MAT-PKG-04', materialName: 'Vỏ ly nhựa PP 700ml', unit: 'cái', quantity: 1, unitCost: 950, totalCost: 950 },
        { id: 'r-13', materialCode: 'MAT-PKG-02', materialName: 'Màng ép nắp ly dập nhiệt', unit: 'cái', quantity: 1, unitCost: 300, totalCost: 300 },
        { id: 'r-14', materialCode: 'MAT-PKG-03', materialName: 'Ống hút giấy bọc màng', unit: 'cái', quantity: 1, unitCost: 700, totalCost: 700 },
      ],
    },
    {
      id: 'bom-003',
      productCode: 'DRK-SEN-M',
      productName: 'Trà Sen Vàng Macchiato',
      categoryName: 'Trà Trái Cây & Macchiato',
      variantName: 'Size M (500ml)',
      sellingPrice: 45000,
      foodCost: 13800,
      foodCostPercentage: 30.7,
      status: 'ACTIVE',
      updatedAt: '03/09/2026 16:45',
      recipeItems: [
        { id: 'r-15', materialCode: 'MAT-TEA-02', materialName: 'Cốt Trà Ô Long Sen Thượng Hạng', unit: 'ml', quantity: 160, unitCost: 40, totalCost: 6400 },
        { id: 'r-16', materialCode: 'MAT-TOP-01', materialName: 'Hạt sen Huế ninh đường phèn', unit: 'g', quantity: 40, unitCost: 80, totalCost: 3200 },
        { id: 'r-17', materialCode: 'MAT-MILK-03', materialName: 'Kem béo Macchiato phô mai', unit: 'ml', quantity: 50, unitCost: 45, totalCost: 2250 },
        { id: 'r-18', materialCode: 'MAT-PKG-01', materialName: 'Vỏ ly nhựa PP 500ml', unit: 'cái', quantity: 1, unitCost: 850, totalCost: 850 },
        { id: 'r-19', materialCode: 'MAT-PKG-05', materialName: 'Nắp bật uống trực tiếp Macchiato', unit: 'cái', quantity: 1, unitCost: 500, totalCost: 500 },
        { id: 'r-20', materialCode: 'MAT-PKG-03', materialName: 'Ống hút giấy bọc màng', unit: 'cái', quantity: 1, unitCost: 700, totalCost: 700 },
      ],
    },
    {
      id: 'bom-004',
      productCode: 'DRK-CF-M',
      productName: 'Cà Phê Muối Pine Special',
      categoryName: 'Cà Phê Pha Máy',
      variantName: 'Tiêu chuẩn (350ml)',
      sellingPrice: 32000,
      foodCost: 8900,
      foodCostPercentage: 27.8,
      status: 'ACTIVE',
      updatedAt: '04/09/2026 08:30',
      recipeItems: [
        { id: 'r-21', materialCode: 'MAT-CF-01', materialName: 'Hạt Arabica Cầu Đất phối Robusta', unit: 'g', quantity: 20, unitCost: 210, totalCost: 4200 },
        { id: 'r-22', materialCode: 'MAT-MILK-04', materialName: 'Sữa đặc Ngôi Sao Phương Nam', unit: 'ml', quantity: 30, unitCost: 35, totalCost: 1050 },
        { id: 'r-23', materialCode: 'MAT-MILK-05', materialName: 'Kem mặn muối hồng Himalaya', unit: 'ml', quantity: 40, unitCost: 45, totalCost: 1800 },
        { id: 'r-24', materialCode: 'MAT-PKG-06', materialName: 'Vỏ ly giấy 350ml kèm nắp tim', unit: 'cái', quantity: 1, unitCost: 1250, totalCost: 1250 },
        { id: 'r-25', materialCode: 'MAT-PKG-03', materialName: 'Ống hút giấy bọc màng', unit: 'cái', quantity: 1, unitCost: 700, totalCost: 700 },
      ],
    },
    {
      id: 'bom-005',
      productCode: 'DRK-PEACH-L',
      productName: 'Trà Đào Cam Sả Tươi',
      categoryName: 'Trà Trái Cây & Macchiato',
      variantName: 'Size L (700ml)',
      sellingPrice: 46000,
      foodCost: 14200,
      foodCostPercentage: 30.9,
      status: 'ACTIVE',
      updatedAt: '02/09/2026 14:10',
      recipeItems: [
        { id: 'r-26', materialCode: 'MAT-TEA-03', materialName: 'Cốt Trà Đen Ceylon thượng hạng', unit: 'ml', quantity: 200, unitCost: 30, totalCost: 6000 },
        { id: 'r-27', materialCode: 'MAT-FRUIT-01', materialName: 'Đào miếng ngâm Kronos', unit: 'miếng', quantity: 3, unitCost: 1200, totalCost: 3600 },
        { id: 'r-28', materialCode: 'MAT-FRUIT-02', materialName: 'Nước cốt cam vàng & Sả cây', unit: 'ml', quantity: 40, unitCost: 40, totalCost: 1600 },
        { id: 'r-29', materialCode: 'MAT-PKG-04', materialName: 'Vỏ ly nhựa PP 700ml', unit: 'cái', quantity: 1, unitCost: 950, totalCost: 950 },
        { id: 'r-30', materialCode: 'MAT-PKG-02', materialName: 'Màng ép nắp ly dập nhiệt', unit: 'cái', quantity: 1, unitCost: 300, totalCost: 300 },
        { id: 'r-31', materialCode: 'MAT-PKG-03', materialName: 'Ống hút giấy bọc màng', unit: 'cái', quantity: 1, unitCost: 700, totalCost: 700 },
      ],
    },
  ];

  getBOMList(filter?: BOMFilter): Observable<ProductBOM[]> {
    let result = [...this.bomList];
    if (filter?.query) {
      const q = filter.query.toLowerCase().trim();
      result = result.filter(
        b => b.productName.toLowerCase().includes(q) || b.productCode.toLowerCase().includes(q)
      );
    }
    return of(result).pipe(delay(250));
  }

  getBOMById(id: string): Observable<ProductBOM | undefined> {
    const item = this.bomList.find(b => b.id === id);
    return of(item).pipe(delay(150));
  }

  updateRecipeItem(bomId: string, recipeItems: RecipeItem[]): Observable<ProductBOM> {
    const idx = this.bomList.findIndex(b => b.id === bomId);
    if (idx >= 0) {
      const totalCost = recipeItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitCost), 0);
      const foodCostPercentage = Math.round((totalCost / this.bomList[idx].sellingPrice) * 1000) / 10;
      this.bomList[idx] = {
        ...this.bomList[idx],
        recipeItems,
        foodCost: totalCost,
        foodCostPercentage,
        updatedAt: 'Vừa cập nhật',
      };
      return of(this.bomList[idx]).pipe(delay(300));
    }
    throw new Error('Not found');
  }
}
