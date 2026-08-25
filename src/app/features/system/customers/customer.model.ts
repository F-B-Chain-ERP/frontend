import {ApiResponseBE, PageResponseBE, formatInstant} from "../users/user.model";

export enum CustomerStatus {
  INACTIVE = 0,
  ACTIVE =1,
}
export interface Customer {
  id: string;
  customerCode: string;
  username: string;
  fullName: string;
  phone: string;
  email: string;
  authProvider: string;
  hasLocalPassword: boolean;
  emailVerified: boolean;
  avatarUrl?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  status: CustomerStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;

}

export interface CustomerFilter {
  query?: string;
  status?: CustomerStatus | null;
  pageIndex: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend' | null;
}

export interface CustomerFormDTO {
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  password?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  emailVerified?: boolean;
  status: CustomerStatus;
}

export interface CustomerDetailResponseBE {
  id: string;
  customerCode: string;
  username: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  authProvider: string;
  hasLocalPassword: boolean;
  emailVerified: boolean;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  status: CustomerStatus;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const CUSTOMER_STATUS_OPTIONS = [
  {
    value: null, label: 'Tất cả trạng thái'
  },
  {
    value: 'ACTIVE',
    label: 'Đang hoạt động',
    badgeClass: 'tbl-badge--success'
  },
  {
    value: 'INACTIVE',
    label: 'Ngừng hoạt động',
    badgeClass: 'tbl-badge--danger'
  },
];

export function getCustomerStatusMeta(status: CustomerStatus | string | null | undefined): {
  label: string;
  badgeClass: string;
  tagColor: string;
  isActive: boolean;
} {
  if (status === 'ACTIVE') {
    return {label: 'Đang hoạt động', badgeClass: 'tbl-badge tbl-badge--success', tagColor: 'success', isActive: true};
  }
  return {label: 'Ngừng hoạt động', badgeClass: 'tbl-badge tbl-badge--danger', tagColor: 'error', isActive: false};
}


export function toLocalDate(
  value: string | null | undefined
): string {
  if(!value) return '';
  return value.length >= 10 ? value.substring(0,10): value;
}

