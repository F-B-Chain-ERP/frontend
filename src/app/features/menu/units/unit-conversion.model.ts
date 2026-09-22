// ── UnitConversion (bảng quy đổi đơn vị, 1 chiều, chiều ngược tự đảo) ─────

export interface UnitConversion {
  id: string;
  fromUnitId: string;
  fromUnitCode?: string | null;
  fromUnitName?: string | null;
  toUnitId: string;
  toUnitCode?: string | null;
  toUnitName?: string | null;
  factor: number;
  status: string;
  createdAt?: string;
}

export interface CreateUnitConversionRequest {
  fromUnitId: string;
  toUnitId: string;
  factor: number;
}

export interface UpdateUnitConversionRequest {
  factor?: number | null;
  status?: string | null;
}
