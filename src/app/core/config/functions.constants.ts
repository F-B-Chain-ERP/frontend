export const FUNCTION_ID = {
  // ── Level 1: Menu groups ───────────────────────────────────────────────────
  HE_THONG: 2692,
  LICH_SU_HOAT_DONG: 2730,
  QUAN_LY_NGUOI_DUNG: 2726,
  QUAN_LY_VAI_TRO: 2661,

  // ── Level 3: Quản lý vai trò ───────────────────────────────────────────────
  PHAN_QUYEN_VAI_TRO: 9760,

  // ── Level ?: Hệ thống - Chi nhánh & Phạm vi ────────────────────────────────
  // TODO(S2-12): thay bằng FUNCTION_ID thật lấy từ DB backend trước khi merge
  QUAN_LY_CHI_NHANH: 8010,
  QUAN_LY_PHAM_VI: 8011,

  // ── Level ?: Mua hàng (PROC) ──────────────────────────────────────────────
  // TODO(S2-11): thay bằng FUNCTION_ID thật lấy từ DB backend trước khi merge
  DON_MUA_HANG: 8002,
  NHA_CUNG_CAP: 8001
} as const;

type RoleSet = { BASE: string; VIEW: string; ADD: string; EDIT: string; DELETE: string };

function buildRole(id: number): RoleSet {
  return {
    BASE: `F${id}`,
    VIEW: `F${id}_VIEW`,
    ADD: `F${id}_ADD`,
    EDIT: `F${id}_EDIT`,
    DELETE: `F${id}_DEL`,
  };
}

export const ROLE = {
  QUAN_LY_NGUOI_DUNG: buildRole(FUNCTION_ID.QUAN_LY_NGUOI_DUNG),
  QUAN_LY_VAI_TRO: buildRole(FUNCTION_ID.QUAN_LY_VAI_TRO),
  PHAN_QUYEN_VAI_TRO: buildRole(FUNCTION_ID.PHAN_QUYEN_VAI_TRO),
  QUAN_LY_CHI_NHANH: buildRole(FUNCTION_ID.QUAN_LY_CHI_NHANH),
  QUAN_LY_PHAM_VI: buildRole(FUNCTION_ID.QUAN_LY_PHAM_VI),
  DON_MUA_HANG: buildRole(FUNCTION_ID.DON_MUA_HANG),
  NHA_CUNG_CAP: buildRole(FUNCTION_ID.NHA_CUNG_CAP),
} as const;

export const FULL_PERMISSION = 'FULL_PERMISSION';
