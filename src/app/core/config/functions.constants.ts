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
  NHA_CUNG_CAP: 8001,

  KHACH_HANG: 9999
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
  KHACH_HANG: buildRole(FUNCTION_ID.KHACH_HANG),
} as const;

export const FULL_PERMISSION = 'FULL_PERMISSION';

/**
 * Mapping các quyền mặc định theo mã vai trò (Role Code) trong hệ thống ERP.
 */
export const DEFAULT_ROLE_AUTHORITIES: Record<string, string[]> = {
  ADMIN: [FULL_PERMISSION, 'ROLE_ADMIN', 'ADMIN'],
  ROLE_ADMIN: [FULL_PERMISSION, 'ROLE_ADMIN', 'ADMIN'],

  // Nhân viên chung: Chỉ có quyền xem danh sách đơn mua hàng, KHÔNG có quyền thêm/sửa/xóa hay xem hệ thống
  STAFF: [ROLE.DON_MUA_HANG.VIEW, ROLE.DON_MUA_HANG.BASE, 'ROLE_STAFF', 'STAFF'],
  ROLE_STAFF: [ROLE.DON_MUA_HANG.VIEW, ROLE.DON_MUA_HANG.BASE, 'ROLE_STAFF', 'STAFF'],

  // Nhân viên Mua hàng: Có quyền tạo PO, sửa nháp PO, tra cứu nhà cung cấp
  PROC_STAFF: [
    ROLE.DON_MUA_HANG.VIEW,
    ROLE.DON_MUA_HANG.ADD,
    ROLE.DON_MUA_HANG.EDIT,
    ROLE.DON_MUA_HANG.BASE,
    ROLE.NHA_CUNG_CAP.VIEW,
    ROLE.NHA_CUNG_CAP.BASE,
    'PROC_STAFF',
    'PURCHASE_STAFF',
  ],
  PURCHASE_STAFF: [
    ROLE.DON_MUA_HANG.VIEW,
    ROLE.DON_MUA_HANG.ADD,
    ROLE.DON_MUA_HANG.EDIT,
    ROLE.DON_MUA_HANG.BASE,
    ROLE.NHA_CUNG_CAP.VIEW,
    ROLE.NHA_CUNG_CAP.BASE,
    'PROC_STAFF',
    'PURCHASE_STAFF',
  ],

  // Trưởng phòng Mua hàng: Toàn quyền module Mua hàng, Nhà cung cấp và duyệt đơn (ALL_SYSTEM)
  PROC_MANAGER: [
    ROLE.DON_MUA_HANG.VIEW,
    ROLE.DON_MUA_HANG.ADD,
    ROLE.DON_MUA_HANG.EDIT,
    ROLE.DON_MUA_HANG.DELETE,
    ROLE.DON_MUA_HANG.BASE,
    ROLE.NHA_CUNG_CAP.VIEW,
    ROLE.NHA_CUNG_CAP.ADD,
    ROLE.NHA_CUNG_CAP.EDIT,
    ROLE.NHA_CUNG_CAP.DELETE,
    ROLE.NHA_CUNG_CAP.BASE,
    'ALL_SYSTEM',
    'PROC_MANAGER',
    'PURCHASE_MGR',
  ],
  PURCHASE_MGR: [
    ROLE.DON_MUA_HANG.VIEW,
    ROLE.DON_MUA_HANG.ADD,
    ROLE.DON_MUA_HANG.EDIT,
    ROLE.DON_MUA_HANG.DELETE,
    ROLE.DON_MUA_HANG.BASE,
    ROLE.NHA_CUNG_CAP.VIEW,
    ROLE.NHA_CUNG_CAP.ADD,
    ROLE.NHA_CUNG_CAP.EDIT,
    ROLE.NHA_CUNG_CAP.DELETE,
    ROLE.NHA_CUNG_CAP.BASE,
    'ALL_SYSTEM',
    'PROC_MANAGER',
    'PURCHASE_MGR',
  ],

  // Quản lý kho: Xem & nhập kho PO
  WAREHOUSE_MGR: [
    ROLE.DON_MUA_HANG.VIEW,
    ROLE.DON_MUA_HANG.EDIT,
    ROLE.DON_MUA_HANG.BASE,
    ROLE.NHA_CUNG_CAP.VIEW,
    'WAREHOUSE_MGR',
  ],
  WAREHOUSE_STAFF: [
    ROLE.DON_MUA_HANG.VIEW,
    ROLE.DON_MUA_HANG.BASE,
    'WAREHOUSE_STAFF',
  ],

  // Quản lý chi nhánh
  BRANCH_MGR: [
    ROLE.DON_MUA_HANG.VIEW,
    ROLE.DON_MUA_HANG.ADD,
    ROLE.DON_MUA_HANG.EDIT,
    ROLE.DON_MUA_HANG.BASE,
    ROLE.NHA_CUNG_CAP.VIEW,
    ROLE.QUAN_LY_CHI_NHANH.VIEW,
    'BRANCH_MGR',
  ],

  // Kế toán
  ACCOUNTANT: [
    ROLE.DON_MUA_HANG.VIEW,
    ROLE.DON_MUA_HANG.BASE,
    ROLE.NHA_CUNG_CAP.VIEW,
    'ACCOUNTANT',
  ],
  CHIEF_ACCOUNTANT: [
    ROLE.DON_MUA_HANG.VIEW,
    ROLE.DON_MUA_HANG.BASE,
    ROLE.NHA_CUNG_CAP.VIEW,
    'CHIEF_ACCOUNTANT',
  ],
};

/**
 * Hàm hỗ trợ giải quyết danh sách Authorities từ roleCodes và username.
 */
export function resolveAuthoritiesForUser(roles: string[] = [], username = ''): string[] {
  if (username === 'admin' || roles.includes('ADMIN') || roles.includes('ROLE_ADMIN')) {
    return [FULL_PERMISSION, 'ROLE_ADMIN', 'ADMIN'];
  }

  const authoritiesSet = new Set<string>();
  for (const role of roles) {
    authoritiesSet.add(role);
    const mapped = DEFAULT_ROLE_AUTHORITIES[role] || DEFAULT_ROLE_AUTHORITIES[role.toUpperCase()];
    if (mapped) {
      mapped.forEach(auth => authoritiesSet.add(auth));
    }
  }

  // Fallback mặc định cho user thường nếu không khớp role nào cụ thể
  if (authoritiesSet.size === 0) {
    DEFAULT_ROLE_AUTHORITIES['STAFF']?.forEach(auth => authoritiesSet.add(auth));
  }

  return Array.from(authoritiesSet);
}

