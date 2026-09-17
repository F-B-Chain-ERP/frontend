/**
 * Model cho Quản lý Khung giờ nhận món tại quán (Pickup Time Slots).
 * Khớp contract backend `/api/v1/branches/{branchId}/pickup-slots`
 * DTOs: PickupTimeSlotResponse, CreatePickupTimeSlotRequest, UpdatePickupTimeSlotRequest, GeneratePickupSlotsRequest.
 */

export interface PickupTimeSlot {
  id: string;
  branchId: string;
  slotCode: string;
  startTime: string; // "HH:mm:ss" hoặc "HH:mm"
  endTime: string;
  maxOrders: number | null;
  currentOrders: number;
  isAvailable: boolean;
  status: 'ACTIVE' | 'INACTIVE' | string;
}

export interface CreatePickupTimeSlotPayload {
  slotCode: string;
  startTime: string; // "HH:mm:ss"
  endTime: string; // "HH:mm:ss"
  maxOrders?: number | null;
  status?: string;
}

export interface UpdatePickupTimeSlotPayload {
  slotCode: string;
  startTime: string;
  endTime: string;
  maxOrders?: number | null;
  status?: string;
}

export interface GeneratePickupSlotsPayload {
  startTime: string;
  endTime: string;
  stepMinutes: number; // 15..120
  maxOrders?: number | null;
}

export interface PickupSlotFilter {
  branchId: string;
  date?: string | null; // "yyyy-MM-dd"
  search?: string;
  availability?: 'all' | 'available' | 'full';
  status?: string | null;
  pageIndex: number;
  pageSize: number;
}

export const PICKUP_SLOT_STATUS_OPTIONS = [
  {value: null, label: 'Tất cả trạng thái'},
  {value: 'ACTIVE', label: 'Đang hoạt động', badgeClass: 'tbl-badge--success'},
  {value: 'INACTIVE', label: 'Tạm ngừng', badgeClass: 'tbl-badge--danger'},
];

export function getPickupSlotStatusMeta(status: string | null | undefined): { label: string; badgeClass: string } {
  if (status === 'ACTIVE') {
    return {label: 'Đang hoạt động', badgeClass: 'tbl-badge tbl-badge--success'};
  }
  return {label: 'Tạm ngừng', badgeClass: 'tbl-badge tbl-badge--danger'};
}

export function getPickupSlotAvailabilityMeta(slot: PickupTimeSlot): {
  label: string;
  badgeClass: string;
  icon: string
} {
  if (!slot.isAvailable) {
    if (slot.maxOrders && slot.currentOrders >= slot.maxOrders) {
      return {label: 'Hết chỗ', badgeClass: 'tbl-badge tbl-badge--danger', icon: 'close-circle'};
    }
    return {label: 'Không khả dụng', badgeClass: 'tbl-badge tbl-badge--neutral', icon: 'stop'};
  }
  return {label: 'Còn nhận đơn', badgeClass: 'tbl-badge tbl-badge--success', icon: 'check-circle'};
}

/**
 * Tính thời lượng khung giờ tính bằng phút.
 */
export function calculateSlotDurationMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const startParts = start.split(':').map(p => parseInt(p, 10));
  const endParts = end.split(':').map(p => parseInt(p, 10));
  const startMin = startParts[0] * 60 + startParts[1];
  const endMin = endParts[0] * 60 + endParts[1];
  return endMin - startMin;
}

/**
 * Tính phần trăm lấp đầy đơn hàng (Occupancy Rate).
 */
export function calculateOccupancyPercent(current: number, max: number | null): number {
  if (!max || max <= 0) return 0;
  const percent = Math.round((current / max) * 100);
  return Math.min(100, Math.max(0, percent));
}
