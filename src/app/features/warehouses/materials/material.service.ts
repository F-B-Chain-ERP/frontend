import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { ApplicationConfigService } from '../../../core/config/application-config.service';
import {
  Material,
  MaterialFilter,
  MaterialListResponse,
  MATERIAL_CATEGORY_OPTIONS,
  MATERIAL_BASE_UNIT_OPTIONS,
} from './material.model';

interface ApiEnvelope<T> {
  status: number;
  errorCode: string | null;
  message: string;
  data: T;
  timestamp: string;
}

interface PageEnvelope<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

/** 5 dữ liệu mẫu nguyên vật liệu sau khi nhập kho theo đúng yêu cầu */
export const INITIAL_MOCK_MATERIALS: Material[] = [
  {
    id: 'mat-001',
    code: 'NVL-SUA-TUOI',
    name: 'Sữa tươi',
    categoryId: 'cat-001',
    categoryName: 'Sữa & chế phẩm',
    category: {
      id: 'cat-001',
      name: 'Sữa & chế phẩm',
    },
    baseUnitId: 'unit-001',
    baseUnitName: 'Mililít (ML)',
    baseUnit: {
      id: 'unit-001',
      code: 'ML',
      name: 'Mililít',
    },
    minStockAlert: 10.0,
    shelfLifeDays: 7,
    isPerishable: true,
    status: 'ACTIVE',
    note: 'Bảo quản nhiệt độ 2-4°C, hạn sử dụng 7 ngày sau nhập kho',
  },
  {
    id: 'mat-002',
    code: 'NVL-CA-PHE-ROBUSTA',
    name: 'Cà phê hạt Robusta Đắk Lắk',
    categoryId: 'cat-002',
    categoryName: 'Trà & Cà phê',
    category: {
      id: 'cat-002',
      name: 'Trà & Cà phê',
    },
    baseUnitId: 'unit-003',
    baseUnitName: 'Kilogram (kg)',
    baseUnit: {
      id: 'unit-003',
      code: 'KG',
      name: 'Kilogram',
    },
    minStockAlert: 25.0,
    shelfLifeDays: 365,
    isPerishable: false,
    status: 'ACTIVE',
    note: 'Bảo quản nơi khô ráo, thoáng mát',
  },
  {
    id: 'mat-003',
    code: 'NVL-DUONG-DEN',
    name: 'Đường đen Hàn Quốc',
    categoryId: 'cat-003',
    categoryName: 'Đường, Siro & Gia vị',
    category: {
      id: 'cat-003',
      name: 'Đường, Siro & Gia vị',
    },
    baseUnitId: 'unit-003',
    baseUnitName: 'Kilogram (kg)',
    baseUnit: {
      id: 'unit-003',
      code: 'KG',
      name: 'Kilogram',
    },
    minStockAlert: 15.0,
    shelfLifeDays: 180,
    isPerishable: false,
    status: 'ACTIVE',
    note: 'Đóng kín túi sau khi sử dụng',
  },
  {
    id: 'mat-004',
    code: 'NVL-TRAN-CHAU-DEN',
    name: 'Trân châu đen cao cấp',
    categoryId: 'cat-004',
    categoryName: 'Topping & Bột pha chế',
    category: {
      id: 'cat-004',
      name: 'Topping & Bột pha chế',
    },
    baseUnitId: 'unit-005',
    baseUnitName: 'Gói (Gói)',
    baseUnit: {
      id: 'unit-005',
      code: 'GOI',
      name: 'Gói',
    },
    minStockAlert: 5.0,
    shelfLifeDays: 90,
    isPerishable: true,
    status: 'ACTIVE',
    note: 'Thời hạn luộc và dùng trong ngày sau khi mở gói',
  },
  {
    id: 'mat-005',
    code: 'NVL-LY-NHUA-500ML',
    name: 'Ly nhựa nắp tim 500ml',
    categoryId: 'cat-005',
    categoryName: 'Bao bì & Đóng gói',
    category: {
      id: 'cat-005',
      name: 'Bao bì & Đóng gói',
    },
    baseUnitId: 'unit-006',
    baseUnitName: 'Thùng (Thùng)',
    baseUnit: {
      id: 'unit-006',
      code: 'THUNG',
      name: 'Thùng',
    },
    minStockAlert: 50.0,
    shelfLifeDays: null,
    isPerishable: false,
    status: 'INACTIVE',
    note: 'Quy cách: 1000 ly / thùng',
  },
];

@Injectable({
  providedIn: 'root',
})
export class WarehouseMaterialService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** Bộ nhớ tạm in-memory để thao tác UI ngay cả khi backend chưa online */
  private memoryMaterials: Material[] = [...INITIAL_MOCK_MATERIALS];

  private get materialApi(): string {
    return this.applicationConfigService.getEndpointFor('api/v1/inv/materials');
  }

  /**
   * Lấy danh sách nguyên vật liệu có hỗ trợ tìm kiếm, lọc và phân trang.
   * Ưu tiên gọi backend, tự động fallback về mock data khi backend chưa sẵn sàng.
   */
  getMaterials(filter: MaterialFilter): Observable<MaterialListResponse> {
    let params = new HttpParams()
      .set('page', String((filter.pageIndex || 1) - 1))
      .set('size', String(filter.pageSize || 10));

    if (filter.query?.trim()) {
      params = params.set('search', filter.query.trim());
    }

    return this.http.get<ApiEnvelope<PageEnvelope<Material>>>(this.materialApi, { params }).pipe(
      map(res => {
        const page = res.data;
        const items = (page?.content ?? []).map(r => this.enrichMaterialNames(r));
        return {
          items,
          total: page?.totalElements ?? items.length,
          pageIndex: filter.pageIndex,
          pageSize: filter.pageSize,
        };
      }),
      catchError(() => {
        // Fallback về mock data với đầy đủ logic filter
        return of(this.filterMockMaterials(filter));
      }),
    );
  }

  getMaterialById(id: string): Observable<Material | null> {
    return this.http.get<ApiEnvelope<Material>>(`${this.materialApi}/${id}`).pipe(
      map(res => (res.data ? this.enrichMaterialNames(res.data) : null)),
      catchError(() => {
        const found = this.memoryMaterials.find(m => m.id === id) ?? null;
        return of(found);
      }),
    );
  }

  createMaterial(payload: Partial<Material>): Observable<Material> {
    return this.http.post<ApiEnvelope<Material>>(this.materialApi, payload).pipe(
      map(res => this.enrichMaterialNames(res.data)),
      catchError(() => {
        const newId = `mat-${Date.now().toString().slice(-4)}`;
        const newMaterial: Material = {
          id: newId,
          code: payload.code || `NVL-${Date.now().toString().slice(-4)}`,
          name: payload.name || '',
          categoryId: payload.categoryId || null,
          baseUnitId: payload.baseUnitId || null,
          minStockAlert: Number(payload.minStockAlert) || 0,
          isPerishable: Boolean(payload.isPerishable),
          status: payload.status || 'ACTIVE',
          note: payload.note || '',
          createdAt: new Date().toISOString(),
        };
        const enriched = this.enrichMaterialNames(newMaterial);
        this.memoryMaterials.unshift(enriched);
        return of(enriched);
      }),
    );
  }

  updateMaterial(id: string, payload: Partial<Material>): Observable<Material> {
    return this.http.put<ApiEnvelope<Material>>(`${this.materialApi}/${id}`, payload).pipe(
      map(res => this.enrichMaterialNames(res.data)),
      catchError(() => {
        const index = this.memoryMaterials.findIndex(m => m.id === id);
        if (index >= 0) {
          const updated: Material = {
            ...this.memoryMaterials[index],
            ...payload,
            minStockAlert: Number(payload.minStockAlert ?? this.memoryMaterials[index].minStockAlert),
            isPerishable: payload.isPerishable !== undefined ? Boolean(payload.isPerishable) : this.memoryMaterials[index].isPerishable,
            updatedAt: new Date().toISOString(),
          };
          this.memoryMaterials[index] = this.enrichMaterialNames(updated);
          return of(this.memoryMaterials[index]);
        }
        return of(this.enrichMaterialNames({ id, ...payload } as Material));
      }),
    );
  }

  deleteMaterial(id: string): Observable<boolean> {
    return this.http.delete<ApiEnvelope<void>>(`${this.materialApi}/${id}`).pipe(
      map(() => true),
      catchError(() => {
        this.memoryMaterials = this.memoryMaterials.filter(m => m.id !== id);
        return of(true);
      }),
    );
  }

  batchDeleteMaterials(ids: string[]): Observable<boolean> {
    const idSet = new Set(ids);
    this.memoryMaterials = this.memoryMaterials.filter(m => !idSet.has(m.id));
    return of(true);
  }

  private filterMockMaterials(filter: MaterialFilter): MaterialListResponse {
    let list = [...this.memoryMaterials];

    if (filter.query?.trim()) {
      const q = filter.query.trim().toLowerCase();
      list = list.filter(
        item =>
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
          (item.baseUnitName && item.baseUnitName.toLowerCase().includes(q)),
      );
    }

    if (filter.status) {
      list = list.filter(item => item.status === filter.status);
    }

    if (filter.categoryId) {
      list = list.filter(item => item.categoryId === filter.categoryId);
    }

    if (filter.isPerishable !== null && filter.isPerishable !== undefined) {
      list = list.filter(item => item.isPerishable === filter.isPerishable);
    }

    const total = list.length;
    const pageIndex = filter.pageIndex || 1;
    const pageSize = filter.pageSize || 10;
    const startIndex = (pageIndex - 1) * pageSize;
    const items = list.slice(startIndex, startIndex + pageSize);

    return {
      items,
      total,
      pageIndex,
      pageSize,
    };
  }

  private enrichMaterialNames(m: Material): Material {
    const cat = MATERIAL_CATEGORY_OPTIONS.find(c => c.value === m.categoryId);
    const unit = MATERIAL_BASE_UNIT_OPTIONS.find(u => u.value === m.baseUnitId);
    const catName = m.category?.name || m.categoryName || cat?.label || m.categoryId || '—';
    const unitName = m.baseUnit?.name || m.baseUnitName || unit?.label || m.baseUnitId || '—';

    const category = m.category || {
      id: m.categoryId || 'cat-001',
      name: catName,
    };

    const baseUnit = m.baseUnit || {
      id: m.baseUnitId || 'unit-001',
      code: 'ML',
      name: unitName,
    };

    return {
      ...m,
      categoryName: catName,
      baseUnitName: unitName,
      category,
      baseUnit,
    };
  }
}
