/**
 * STORE MODULE - DATA MODELS & ENUMS
 * Định nghĩa cấu trúc dữ liệu cho:
 * 1. Khung ca chuẩn (Shift Template)
 * 2. Phân ca nhân viên (Shift Assignment)
 * 3. Vận hành & Biên bản chốt két ca (Shift Operation & Shift Report)
 * 4. Báo cáo ngày cửa hàng & Khóa sổ (Store Daily Report)
 * 5. Tồn sản phẩm mở bán POS (Pos Daily Stock)
 */

export enum ShiftStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ShiftAssignmentStatus {
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  ABSENT = 'ABSENT',
  CANCELLED = 'CANCELLED',
}

export enum ShiftReportStatus {
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export enum DailyReportStatus {
  OPEN = 'OPEN',
  SUBMITTED = 'SUBMITTED',
  RECONCILED = 'RECONCILED',
}

// ── 1. Khung ca chuẩn (Shift Template) ──────────────────────────────
export interface Shift {
  id: string;
  branchId: string;
  branchName?: string;
  shiftCode: string;
  shiftName: string;
  startTime: string; // 'HH:mm:ss'
  endTime: string;   // 'HH:mm:ss'
  status: ShiftStatus | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateShiftPayload {
  branchId: string;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  status?: string;
}

export interface UpdateShiftPayload {
  shiftName: string;
  startTime: string;
  endTime: string;
  status: string;
}

// ── 2. Phân ca nhân viên (Shift Assignment) ────────────────────────
export interface ShiftAssignment {
  id: string;
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  branchId: string;
  branchName?: string;
  accountId: string;
  employeeName: string;
  employeeEmail: string;
  workDate: string; // 'YYYY-MM-DD'
  status: ShiftAssignmentStatus | string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  initialCash: number;
  finalCash: number;
  cashDifference: number;
  note?: string;
  createdAt?: string;
}

export interface CreateShiftAssignmentPayload {
  shiftId: string;
  branchId: string;
  accountId: string;
  workDate: string;
  note?: string;
}

export interface BulkAssignItemPayload {
  shiftId: string;
  accountId: string;
  workDate: string;
  note?: string;
}

export interface BulkAssignShiftPayload {
  branchId: string;
  assignments: BulkAssignItemPayload[];
}

// ── 3. Vận hành & Chốt két ca (Shift Operations & Report) ───────────
export interface OpenShiftPayload {
  initialCash: number;
  note?: string;
}

export interface CloseShiftPayload {
  actualCash: number;
  closingCashActual?: number;
  cashPayout?: number;
  cashDenominations?: string;
  differenceReason?: string;
  note?: string;
}

export interface ClosingSummary {
  assignmentId: string;
  branchId: string;
  shiftCode: string;
  shiftName: string;
  cashierId: string;
  cashierName: string;
  checkInAt: string;
  initialCash: number;
  cashSales: number;
  cardSales: number;
  bankTransferSales: number;
  ewalletSales: number;
  totalSales: number;
  ordersCount: number;
  cashPayout: number;
  expectedCash: number;
}

export interface ShiftReport {
  id: string;
  assignmentId: string;
  branchId: string;
  branchName?: string;
  businessDate: string;
  initialCash: number;
  cashSales: number;
  cardSales: number;
  bankTransferSales: number;
  ewalletSales: number;
  totalSales: number;
  ordersCount: number;
  cashPayout: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  differenceReason?: string;
  cashDenominations?: string;
  status: ShiftReportStatus | string;
  submittedById?: string;
  submittedByName?: string;
  submittedAt?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  note?: string;
  createdAt?: string;
}

export interface ConfirmShiftReportPayload {
  note?: string;
}

// ── 4. Báo cáo ngày cửa hàng (Store Daily Report) ───────────────────
export interface StoreDailyReport {
  id: string;
  branchId: string;
  branchName?: string;
  businessDate: string;
  openingCash: number;
  closingCash: number;
  totalOrders: number;
  grossRevenue: number;
  discountAmount: number;
  netRevenue: number;
  cashAmount: number;
  transferAmount: number;
  status: DailyReportStatus | string;
  submittedById?: string;
  submittedByName?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GenerateDailyReportPayload {
  branchId: string;
  businessDate: string;
}

export interface UpdateDailyReportPayload {
  openingCash?: number;
  closingCash?: number;
  note?: string;
}

// ── 5. Tồn sản phẩm mở bán POS (Pos Daily Stock) ────────────────────
export interface PosDailyStock {
  branchId: string;
  variantId: string;
  productName?: string;
  variantName?: string;
  sku?: string;
  businessDate: string;
  openingQuantity: number;
  remainingQuantity: number;
  soldQuantity: number;
}

export interface RestockDailyStockPayload {
  branchId: string;
  variantId: string;
  openingQuantity: number;
  note?: string;
}

// ── Helper Options & Badges Meta (Đồng bộ UI Kit) ───────────────────
export const SHIFT_ASSIGNMENT_STATUS_OPTIONS = [
  { value: null, label: 'Tất cả trạng thái' },
  { value: ShiftAssignmentStatus.SCHEDULED, label: 'Đã lên lịch', badgeClass: 'tbl-badge--neutral' },
  { value: ShiftAssignmentStatus.CHECKED_IN, label: 'Đang làm việc', badgeClass: 'tbl-badge--primary' },
  { value: ShiftAssignmentStatus.CHECKED_OUT, label: 'Đã kết ca', badgeClass: 'tbl-badge--success' },
  { value: ShiftAssignmentStatus.ABSENT, label: 'Vắng mặt', badgeClass: 'tbl-badge--warning' },
  { value: ShiftAssignmentStatus.CANCELLED, label: 'Đã hủy ca', badgeClass: 'tbl-badge--danger' },
];

export function getShiftAssignmentStatusMeta(status: string | null | undefined): { label: string; badgeClass: string } {
  const str = String(status).toUpperCase();
  switch (str) {
    case 'CHECKED_IN':
      return { label: 'Đang làm việc', badgeClass: 'tbl-badge tbl-badge--primary' };
    case 'CHECKED_OUT':
      return { label: 'Đã kết ca', badgeClass: 'tbl-badge tbl-badge--success' };
    case 'ABSENT':
      return { label: 'Vắng mặt', badgeClass: 'tbl-badge tbl-badge--warning' };
    case 'CANCELLED':
      return { label: 'Đã hủy', badgeClass: 'tbl-badge tbl-badge--danger' };
    case 'SCHEDULED':
    default:
      return { label: 'Đã lên lịch', badgeClass: 'tbl-badge tbl-badge--neutral' };
  }
}

export function getShiftReportStatusMeta(status: string | null | undefined): { label: string; badgeClass: string } {
  const str = String(status).toUpperCase();
  switch (str) {
    case 'CONFIRMED':
    case 'APPROVED':
      return { label: 'Đã duyệt nộp két', badgeClass: 'tbl-badge tbl-badge--success' };
    case 'REJECTED':
      return { label: 'Từ chối bàn giao', badgeClass: 'tbl-badge tbl-badge--danger' };
    case 'SUBMITTED':
    default:
      return { label: 'Chờ duyệt chốt két', badgeClass: 'tbl-badge tbl-badge--warning' };
  }
}

export function getDailyReportStatusMeta(status: string | null | undefined): { label: string; badgeClass: string } {
  const str = String(status).toUpperCase();
  switch (str) {
    case 'RECONCILED':
    case 'APPROVED':
      return { label: 'Đã khóa sổ', badgeClass: 'tbl-badge tbl-badge--success' };
    case 'SUBMITTED':
      return { label: 'Chờ khóa sổ', badgeClass: 'tbl-badge tbl-badge--warning' };
    case 'OPEN':
    default:
      return { label: 'Đang mở', badgeClass: 'tbl-badge tbl-badge--primary' };
  }
}
