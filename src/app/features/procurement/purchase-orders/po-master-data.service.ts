import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from '../../../core/config/application-config.service';
import { ApiResponse } from '../../login/login.model';

export interface SupplierOption {
  id: string;
  name: string;
}

export interface WarehouseOption {
  id: string;
  name: string;
}

export interface MaterialOption {
  id: string;
  name: string;
  baseUnitId: string;
}

export interface UnitOption {
  id: string;
  name: string;
}

/**
 * Dữ liệu danh mục phục vụ form Đơn mua hàng.
 *
 * TODO(S2-11): Hiện mới có API Nhà cung cấp là thật (/api/v1/proc/suppliers).
 * Các danh mục Kho, Nguyên liệu, Đơn vị tính BE chưa expose controller
 * (đã có MaterialRepository/UnitRepository/WarehouseRepository nhưng chưa có REST API),
 * nên tạm dùng mock in-memory — khi BE bổ sung endpoint thì thay thân các method tương ứng.
 */
@Injectable({
  providedIn: 'root',
})
export class PoMasterDataService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** Danh sách nhà cung cấp (API thật). */
  getSuppliers(): Observable<SupplierOption[]> {
    const params = { page: '0', size: '200' };
    return this.http
      .get<
        ApiResponse<{ content: { id: string; name: string | null }[] }>
      >(this.applicationConfigService.getEndpointFor('api/v1/proc/suppliers'), { params })
      .pipe(map(res => (res.data?.content ?? []).map(s => ({ id: s.id, name: s.name ?? s.id }))));
  }

  /** Danh sách kho nhận hàng (mock chờ BE). */
  getWarehouses(): Observable<WarehouseOption[]> {
    return this.mockWarehouses$();
  }

  /** Danh sách nguyên liệu (mock chờ BE) — kèm baseUnitId để tự điền đơn vị tính. */
  getMaterials(): Observable<MaterialOption[]> {
    return this.mockMaterials$();
  }

  /** Danh sách đơn vị tính (mock chờ BE). */
  getUnits(): Observable<UnitOption[]> {
    return this.mockUnits$();
  }

  private mockWarehouses$(): Observable<WarehouseOption[]> {
    return this.delay([
      { id: '3f1d2a4e-1111-4aaa-9bbb-000000000001', name: 'Kho nguyên liệu trung tâm' },
      { id: '3f1d2a4e-1111-4aaa-9bbb-000000000002', name: 'Kho chi nhánh Quận 1' },
      { id: '3f1d2a4e-1111-4aaa-9bbb-000000000003', name: 'Kho chi nhánh Thủ Đức' },
    ]);
  }

  private mockMaterials$(): Observable<MaterialOption[]> {
    const kg = 'u-kg';
    const chai = 'u-chai';
    const thung = 'u-thung';
    const hop = 'u-hop';

    return this.delay([
      { id: 'm-ca-phe', name: 'Cà phê nhân Robusta', baseUnitId: kg },
      { id: 'm-sua-tuoi', name: 'Sữa tươi thanh trùng', baseUnitId: thung },
      { id: 'm-syrup', name: 'Syrup caramel', baseUnitId: chai },
      { id: 'm-tra-xanh', name: 'Trà xanh búp Thái Nguyên', baseUnitId: kg },
      { id: 'm-cacao', name: 'Bột cacao', baseUnitId: kg },
      { id: 'm-kem-tuoi', name: 'Kem tươi', baseUnitId: hop },
    ]);
  }

  private mockUnits$(): Observable<UnitOption[]> {
    return this.delay([
      { id: 'u-kg', name: 'Kilogram (kg)' },
      { id: 'u-chai', name: 'Chai' },
      { id: 'u-thung', name: 'Thùng' },
      { id: 'u-hop', name: 'Hộp' },
      { id: 'u-lit', name: 'Lít' },
    ]);
  }

  private delay<T>(value: T): Observable<T> {
    return new Observable<T>(subscriber => {
      const timer = setTimeout(() => {
        subscriber.next(value);
        subscriber.complete();
      }, 150);
      return () => clearTimeout(timer);
    });
  }
}
