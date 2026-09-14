export type VoucherStatus = 'ACTIVE' | 'INACTIVE';
export type VoucherDiscountType = 'PERCENT' | 'FIXED';

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  usageLimit?: number | null;
  usedCount: number;
  usageLimitPerCustomer?: number | null;
  startAt: string;
  endAt: string;
  status: VoucherStatus;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface VoucherBranch {
  id: string;
  voucherId: string;
  branchId: string;
  branchName?: string;
  status: string;
  createdAt?: string;
}

export interface VoucherUsage {
  id: string;
  voucherId: string;
  orderId: string;
  customerId?: string | null;
  discountAmount: number;
  usedAt: string;
  status: string;
}

export interface VoucherDetail {
  voucher: Voucher;
  branches: VoucherBranch[];
}

export interface VoucherFilter {
  query?: string;
  status?: VoucherStatus | null;
  pageIndex: number;
  pageSize: number;
}

export interface VoucherFormDTO {
  code: string;
  name: string;
  description?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  usageLimit?: number | null;
  usageLimitPerCustomer?: number | null;
  startAt: string;
  endAt: string;
  status: VoucherStatus;
}

export interface VoucherListResponse {
  items: Voucher[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface VoucherUsageListResponse {
  items: VoucherUsage[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export type VoucherStatusOption = { value: VoucherStatus | null; label: string; badgeClass?: string };

export const VOUCHER_STATUS_OPTIONS: VoucherStatusOption[] = [
  { value: null, label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang hoạt động', badgeClass: 'tbl-badge--success' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động', badgeClass: 'tbl-badge--danger' },
];

export const VOUCHER_DISCOUNT_TYPE_OPTIONS: { value: VoucherDiscountType | null; label: string }[] = [
  { value: null, label: 'Tất cả loại' },
  { value: 'PERCENT', label: 'Phần trăm (%)' },
  { value: 'FIXED', label: 'Số tiền cố định' },
];

export function getVoucherStatusMeta(status: string | null | undefined): {
  label: string;
  badgeClass: string;
  tagColor: string;
  isActive: boolean;
} {
  if (status === 'ACTIVE') {
    return {
      label: 'Đang hoạt động',
      badgeClass: 'tbl-badge tbl-badge--success',
      tagColor: 'success',
      isActive: true,
    };
  }
  return {
    label: 'Ngừng hoạt động',
    badgeClass: 'tbl-badge tbl-badge--danger',
    tagColor: 'error',
    isActive: false,
  };
}

export function getDiscountTypeLabel(type: string | null | undefined): string {
  if (type === 'PERCENT') return 'Phần trăm (%)';
  if (type === 'FIXED') return 'Số tiền cố định';
  return '—';
}

export function getDiscountLabel(voucher: Pick<Voucher, 'discountType' | 'discountValue' | 'maxDiscountAmount'>): string {
  const value = voucher.discountValue;
  if (voucher.discountType === 'PERCENT') {
    const base = `${value.toLocaleString('vi-VN')}%`;
    const max = voucher.maxDiscountAmount != null ? voucher.maxDiscountAmount : null;
    return max != null ? `${base} (tối đa ${max.toLocaleString('vi-VN')}₫)` : base;
  }
  return `${value.toLocaleString('vi-VN')}₫`;
}

/** Format Instant (ISO-8601) sang "YYYY-MM-DD HH:mm:ss" để hiển thị nhất quán. */
export function formatInstant(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
