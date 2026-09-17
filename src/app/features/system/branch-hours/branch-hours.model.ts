/**
 * Model cho quản lý Lịch hoạt động tuần của chi nhánh.
 * Khớp contract backend `/api/v1/branches/{branchId}/hours`
 * DTOs: BranchHoursResponse, BatchUpdateBranchHoursRequest, UpdateBranchHoursItemRequest.
 */

export interface BranchHours {
  id?: string;
  branchId: string;
  dayOfWeek: number; // 1 = Thứ Hai, 7 = Chủ Nhật
  dayName?: string;
  openTime: string; // Định dạng "HH:mm:ss" hoặc "HH:mm"
  closeTime: string;
  isClosed: boolean;
  isOvernight?: boolean;
  status: string; // 'ACTIVE' | 'INACTIVE'
}

export interface UpdateBranchHoursItem {
  dayOfWeek: number;
  openTime: string | null; // "HH:mm:ss"
  closeTime: string | null; // "HH:mm:ss"
  isClosed: boolean;
  status?: string;
}

export interface BatchUpdateBranchHoursRequest {
  hours: UpdateBranchHoursItem[];
}

export interface DayOfWeekMeta {
  dayOfWeek: number;
  label: string;
  shortLabel: string;
  isWeekend: boolean;
}

export const DAYS_OF_WEEK: DayOfWeekMeta[] = [
  { dayOfWeek: 1, label: 'Thứ Hai', shortLabel: 'T2', isWeekend: false },
  { dayOfWeek: 2, label: 'Thứ Ba', shortLabel: 'T3', isWeekend: false },
  { dayOfWeek: 3, label: 'Thứ Tư', shortLabel: 'T4', isWeekend: false },
  { dayOfWeek: 4, label: 'Thứ Năm', shortLabel: 'T5', isWeekend: false },
  { dayOfWeek: 5, label: 'Thứ Sáu', shortLabel: 'T6', isWeekend: false },
  { dayOfWeek: 6, label: 'Thứ Bảy', shortLabel: 'T7', isWeekend: true },
  { dayOfWeek: 7, label: 'Chủ Nhật', shortLabel: 'CN', isWeekend: true },
];

/**
 * Chuyển đổi chuỗi "HH:mm:ss" hoặc "HH:mm" thành đối tượng Date (cho nz-time-picker).
 */
export function timeStringToDate(timeStr: string | null | undefined): Date | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const d = new Date();
  d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), parts[2] ? parseInt(parts[2], 10) : 0, 0);
  return d;
}

/**
 * Chuyển đối tượng Date thành chuỗi "HH:mm:ss" gửi lên Backend.
 */
export function dateToTimeString(d: Date | null | undefined): string | null {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return null;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Hiển thị giờ ngắn dạng "HH:mm".
 */
export function formatTimeShort(timeStr: string | null | undefined): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return timeStr;
}

/**
 * Tính toán độ dài thời gian mở cửa (ví dụ "15.0 giờ").
 */
export function calculateWorkingHours(openStr: string | null, closeStr: string | null, isClosed: boolean): string {
  if (isClosed || !openStr || !closeStr) {
    return 'Đóng cửa';
  }
  const openDate = timeStringToDate(openStr);
  const closeDate = timeStringToDate(closeStr);
  if (!openDate || !closeDate) return '--';

  let diffMinutes = (closeDate.getHours() * 60 + closeDate.getMinutes()) - (openDate.getHours() * 60 + openDate.getMinutes());
  if (diffMinutes <= 0) {
    // Ca qua đêm (+24h)
    diffMinutes += 24 * 60;
  }

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (mins === 0) {
    return `${hours} giờ`;
  }
  return `${hours}h ${mins}p`;
}
