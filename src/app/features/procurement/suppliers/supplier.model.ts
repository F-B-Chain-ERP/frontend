export enum SupplierStatus {
  INACTIVE = 0,
  ACTIVE = 1,
}

export interface Supplier {
  id: string | number;
  code: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  status: SupplierStatus;
  note?: string;
  paymentTermDays?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierFilter {
  query?: string;
  status?: SupplierStatus | null;
  pageIndex: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend' | null;
}

export interface SupplierFormDTO {
  code: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  status: SupplierStatus;
  paymentTermDays?: number;
  note?: string;
}

export interface SupplierListResponse {
  items: Supplier[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const SUPPLIER_STATUS_OPTIONS = [
  { value: null, label: 'Tất cả trạng thái' },
  { value: SupplierStatus.ACTIVE, label: 'Đang hợp tác', badgeClass: 'tbl-badge--success' },
  { value: SupplierStatus.INACTIVE, label: 'Ngừng hợp tác', badgeClass: 'tbl-badge--danger' },
];

export function getSupplierStatusMeta(status: SupplierStatus): {
  label: string;
  badgeClass: string;
  tagColor: string;
  isActive: boolean;
} {
  if (status === SupplierStatus.ACTIVE) {
    return {
      label: 'Đang hợp tác',
      badgeClass: 'tbl-badge tbl-badge--success',
      tagColor: 'success',
      isActive: true,
    };
  }
  return {
    label: 'Ngừng hợp tác',
    badgeClass: 'tbl-badge tbl-badge--danger',
    tagColor: 'error',
    isActive: false,
  };
}
