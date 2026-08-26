/**
 * Bản đồ quyền dùng cho guard/structural directive ẩn hiện UI
 * (`*erpUTTHasSomeAuthority`).
 *
 * QUAN TRỌNG: giá trị của mỗi `ROLE.<nhóm>.<BASE|VIEW|ADD|EDIT|DELETE>`
 * là **permission code thật từ backend** (đồng bộ với file Permission.md / bảng
 * `permission` ở BE). Giữ nguyên TÊN nhóm để các template không phải đổi; chỉ
 * đổi VALUE. Quyền thực tế của user được lấy qua `GET /api/v1/auth/my-permission`
 * (xem LoginService.loadMyPermissions) và đẩy vào `account.authorities`.
 *
 * Không còn map role -> quyền cứng (DEFAULT_ROLE_AUTHORITIES) cũng như hệ
 * FunctionsId giả (F{id}). Nguồn chân lý duy nhất là permission code BE.
 */

export const FULL_PERMISSION = 'FULL_PERMISSION';

/** Trả về nhóm quyền (BASE = xem/khay truy cập, VIEW, ADD, EDIT, DELETE). */
function grp(view: string, add: string, edit: string, del: string) {
  return { BASE: view, VIEW: view, ADD: add, EDIT: edit, DELETE: del };
}

/**
 * 8 nhóm chức năng đang được UI gate. VALUE = permission code thật bên BE.
 * (Tên nhóm mapping: QUAN_LY_NGUOI_DUNG=account, QUAN_LY_VAI_TRO=role,
 * PHAN_QUYEN_VAI_TRO=role_permission, QUAN_LY_CHI_NHANH=branch,
 * QUAN_LY_PHAM_VI=scope, DON_MUA_HANG=purchase_order, NHA_CUNG_CAP=supplier,
 * KHACH_HANG=customer.)
 */
export const ROLE = {
  QUAN_LY_NGUOI_DUNG: grp('sys:account:view', 'sys:account:create', 'sys:account:update', 'sys:account:delete'),
  QUAN_LY_VAI_TRO: grp('sys:role:view', 'sys:role:create', 'sys:role:update', 'sys:role:delete'),
  PHAN_QUYEN_VAI_TRO: grp('sys:role:view', 'sys:role_permission:create', 'sys:role_permission:create', 'sys:role_permission:delete'),
  QUAN_LY_CHI_NHANH: grp('sys:branch:view', 'sys:branch:create', 'sys:branch:update', 'sys:branch:delete'),
  QUAN_LY_PHAM_VI: grp('sys:scope:view', 'sys:scope:create', 'sys:scope:update', 'sys:scope:delete'),
  DON_MUA_HANG: grp('proc:purchase_order:view', 'proc:purchase_order:create', 'proc:purchase_order:update', 'proc:purchase_order:delete'),
  NHA_CUNG_CAP: grp('proc:supplier:view', 'proc:supplier:create', 'proc:supplier:update', 'proc:supplier:delete'),
  KHACH_HANG: grp('customer:view', 'customer:create', 'customer:update', 'customer:delete'),
};
