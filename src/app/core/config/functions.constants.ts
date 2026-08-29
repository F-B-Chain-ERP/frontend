/**
 * Bản đồ quyền dùng cho guard/structural directive ẩn hiện UI
 * (`*erpUTTHasSomeAuthority`).
 *
 * QUAN TRỌNG: giá trị của mỗi `ROLE.<nhóm>.<VIEW|CREATE|UPDATE|DELETE>`
 * là **permission code thật từ backend* * (đồng bộ với file Permission.md / bảng
 * `permission` ở BE - 010-permission-seed.sql 200 code). Đổi VALUE cho khớp BE,
 * giữ nguyên TÊN nhóm để template không phải đổi. Quyền thực tế lấy qua
 * `GET /api/v1/auth/my-permission` (LoginService.loadMyPermissions) và đẩy vào
 * `account.authorities`.
 *
 * Đồng bộ toàn bộ 200 permission BE, nhóm theo module để dễ kiểm soát.
 * Convention BE: `<module>:<resource>:<action>` với action = view/create/update/delete
 */

export const FULL_PERMISSION = 'FULL_PERMISSION';

/** Trả về nhóm quyền chuẩn BE: view/create/update/delete. */
function grp(view: string, create: string, update: string, del: string) {
  return { VIEW: view, CREATE: create, UPDATE: update, DELETE: del, BASE: view } as const;
}

/**
 * Toàn bộ nhóm chức năng - VALUE = permission code thật bên BE.
 * Mapping tên nhóm giữ nguyên 8 nhóm cũ + bổ sung đầy đủ các module còn thiếu
 * để FE đồng bộ 100% với Permission.md / 010-permission-seed.sql.
 */
export const ROLE = {
  // ── SYS (12 resource) ───────────────────────────────────────────
  QUAN_LY_NGUOI_DUNG: grp('sys:account:view', 'sys:account:create', 'sys:account:update', 'sys:account:delete'),
  QUAN_LY_VAI_TRO: grp('sys:role:view', 'sys:role:create', 'sys:role:update', 'sys:role:delete'),
  PHAN_QUYEN_VAI_TRO: grp('sys:role:view', 'sys:role_permission:create', 'sys:role_permission:create', 'sys:role_permission:delete'),
  QUAN_LY_PHAM_VI: grp('sys:scope:view', 'sys:scope:create', 'sys:scope:update', 'sys:scope:delete'),
  QUAN_LY_CHI_NHANH: grp('sys:branch:view', 'sys:branch:create', 'sys:branch:update', 'sys:branch:delete'),
  QUAN_LY_GIO_HOAT_DONG: grp('sys:branch_hours:view', 'sys:branch_hours:create', 'sys:branch_hours:update', 'sys:branch_hours:delete'),
  QUAN_LY_KHUNG_GIO_PICKUP: grp('sys:pickup_slot:view', 'sys:pickup_slot:create', 'sys:pickup_slot:update', 'sys:pickup_slot:delete'),
  QUAN_LY_CAI_DAT: grp('sys:setting:view', 'sys:setting:create', 'sys:setting:update', 'sys:setting:delete'),
  // View-only SYS
  XEM_PERMISSION: grp('sys:permission:view', 'sys:permission:view', 'sys:permission:view', 'sys:permission:view'),
  XEM_AUDIT: grp('sys:audit:view', 'sys:audit:view', 'sys:audit:view', 'sys:audit:view'),
  QUAN_LY_SESSION: grp('sys:session:view', 'sys:session:view', 'sys:session:view', 'sys:session:delete'),

  // ── CUSTOMER (4 resource) ───────────────────────────────────────
  KHACH_HANG: grp('customer:customer:view', 'customer:customer:create', 'customer:customer:update', 'customer:customer:delete'),
  KHACH_HANG_DIA_CHI: grp('customer:address:view', 'customer:address:create', 'customer:address:update', 'customer:address:delete'),
  KHACH_HANG_LOYALTY: grp('customer:loyalty:view', 'customer:loyalty:create', 'customer:loyalty:update', 'customer:loyalty:delete'),
  XEM_LICH_SU_LOYALTY: grp('customer:loyalty_history:view', 'customer:loyalty_history:view', 'customer:loyalty_history:view', 'customer:loyalty_history:view'),

  // ── MENU (13 resource) ──────────────────────────────────────────
  DANH_MUC: grp('menu:category:view', 'menu:category:create', 'menu:category:update', 'menu:category:delete'),
  DON_VI_TINH: grp('menu:unit:view', 'menu:unit:create', 'menu:unit:update', 'menu:unit:delete'),
  SAN_PHAM: grp('menu:product:view', 'menu:product:create', 'menu:product:update', 'menu:product:delete'),
  BIEN_THE_SAN_PHAM: grp('menu:variant:view', 'menu:variant:create', 'menu:variant:update', 'menu:variant:delete'),
  DINH_LUONG_BOM: grp('menu:bom:view', 'menu:bom:create', 'menu:bom:update', 'menu:bom:delete'),
  TOPPING: grp('menu:topping:view', 'menu:topping:create', 'menu:topping:update', 'menu:topping:delete'),
  SAN_PHAM_TOPPING: grp('menu:product_topping:view', 'menu:product_topping:create', 'menu:product_topping:update', 'menu:product_topping:delete'),
  COMBO: grp('menu:combo:view', 'menu:combo:create', 'menu:combo:update', 'menu:combo:delete'),
  SAN_PHAM_KHA_DUNG: grp('menu:product_availability:view', 'menu:product_availability:create', 'menu:product_availability:update', 'menu:product_availability:delete'),
  TOPPING_KHA_DUNG: grp('menu:topping_availability:view', 'menu:topping_availability:create', 'menu:topping_availability:update', 'menu:topping_availability:delete'),
  VOUCHER: grp('menu:voucher:view', 'menu:voucher:create', 'menu:voucher:update', 'menu:voucher:delete'),
  VOUCHER_CHI_NHANH: grp('menu:voucher_branch:view', 'menu:voucher_branch:create', 'menu:voucher_branch:view', 'menu:voucher_branch:delete'),
  XEM_VOUCHER_USAGE: grp('menu:voucher_usage:view', 'menu:voucher_usage:view', 'menu:voucher_usage:view', 'menu:voucher_usage:view'),

  // ── PROC (3 resource) ───────────────────────────────────────────
  NHA_CUNG_CAP: grp('proc:supplier:view', 'proc:supplier:create', 'proc:supplier:update', 'proc:supplier:delete'),
  BANG_GIA_NCC: grp('proc:supplier_material:view', 'proc:supplier_material:create', 'proc:supplier_material:update', 'proc:supplier_material:delete'),
  DON_MUA_HANG: grp('proc:purchase_order:view', 'proc:purchase_order:create', 'proc:purchase_order:update', 'proc:purchase_order:delete'),

  // ── INV (7 resource) ────────────────────────────────────────────
  NGUYEN_VAT_LIEU: grp('inv:material:view', 'inv:material:create', 'inv:material:update', 'inv:material:delete'),
  KHO: grp('inv:warehouse:view', 'inv:warehouse:create', 'inv:warehouse:update', 'inv:warehouse:delete'),
  XEM_TON_KHO: grp('inv:stock_balance:view', 'inv:stock_balance:view', 'inv:stock_balance:view', 'inv:stock_balance:view'),
  NHAP_KHO: grp('inv:stock_in:view', 'inv:stock_in:create', 'inv:stock_in:update', 'inv:stock_in:delete'),
  XUAT_KHO: grp('inv:stock_out:view', 'inv:stock_out:create', 'inv:stock_out:update', 'inv:stock_out:delete'),
  CHUYEN_KHO: grp('inv:stock_transfer:view', 'inv:stock_transfer:create', 'inv:stock_transfer:update', 'inv:stock_transfer:delete'),
  KIEM_KE: grp('inv:stock_count:view', 'inv:stock_count:create', 'inv:stock_count:update', 'inv:stock_count:delete'),

  // ── STORE (5 resource) ──────────────────────────────────────────
  CA_LAM_VIEC: grp('store:shift:view', 'store:shift:create', 'store:shift:update', 'store:shift:delete'),
  PHAN_CA: grp('store:shift_assignment:view', 'store:shift_assignment:create', 'store:shift_assignment:update', 'store:shift_assignment:delete'),
  BAO_CAO_NGAY: grp('store:daily_report:view', 'store:daily_report:create', 'store:daily_report:update', 'store:daily_report:delete'),
  XEM_TON_SAN_PHAM: grp('store:product_stock:view', 'store:product_stock:view', 'store:product_stock:view', 'store:product_stock:view'),
  XEM_LICH_SU_TON_SAN_PHAM: grp('store:product_stock_history:view', 'store:product_stock_history:view', 'store:product_stock_history:view', 'store:product_stock_history:view'),

  // ── POS (7 resource) ────────────────────────────────────────────
  DON_HANG: grp('pos:order:view', 'pos:order:create', 'pos:order:update', 'pos:order:delete'),
  GIAO_HANG: grp('pos:delivery:view', 'pos:delivery:create', 'pos:delivery:update', 'pos:delivery:delete'),
  XEM_LICH_SU_TRANG_THAI_DON: grp('pos:order_status_history:view', 'pos:order_status_history:view', 'pos:order_status_history:view', 'pos:order_status_history:view'),
  Y_DINH_THANH_TOAN: grp('pos:payment_intent:view', 'pos:payment_intent:create', 'pos:payment_intent:update', 'pos:payment_intent:view'),
  GIAO_DICH: grp('pos:transaction:view', 'pos:transaction:create', 'pos:transaction:update', 'pos:transaction:view'),
  HOAN_TIEN: grp('pos:refund:view', 'pos:refund:create', 'pos:refund:update', 'pos:refund:delete'),
  KDS_TICKET: grp('pos:kds_ticket:view', 'pos:kds_ticket:view', 'pos:kds_ticket:update', 'pos:kds_ticket:view'),

  // ── FIN (4 resource) ────────────────────────────────────────────
  CONG_NO_PHAI_TRA: grp('fin:payable:view', 'fin:payable:create', 'fin:payable:update', 'fin:payable:delete'),
  THANH_TOAN_CONG_NO: grp('fin:payable_payment:view', 'fin:payable_payment:create', 'fin:payable_payment:update', 'fin:payable_payment:delete'),
  CHI_PHI: grp('fin:expense:view', 'fin:expense:create', 'fin:expense:update', 'fin:expense:delete'),
  TONG_HOP_TAI_CHINH: grp('fin:financial_summary:view', 'fin:financial_summary:view', 'fin:financial_summary:update', 'fin:financial_summary:view'),

  // ── PLATFORM (5 resource) ───────────────────────────────────────
  MAU_THONG_BAO: grp('platform:notification_template:view', 'platform:notification_template:create', 'platform:notification_template:update', 'platform:notification_template:delete'),
  THONG_BAO: grp('platform:notification:view', 'platform:notification:create', 'platform:notification:update', 'platform:notification:view'),
  PHONG_CHAT: grp('platform:chat_room:view', 'platform:chat_room:create', 'platform:chat_room:update', 'platform:chat_room:view'),
  TIN_NHAN: grp('platform:chat_message:view', 'platform:chat_message:create', 'platform:chat_message:update', 'platform:chat_message:view'),
  YEU_CAU_XUAT: grp('platform:export_request:view', 'platform:export_request:create', 'platform:export_request:view', 'platform:export_request:view'),
};
