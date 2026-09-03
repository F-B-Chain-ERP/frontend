export enum UserStatus {
  INACTIVE = 0,
  ACTIVE = 1,
}

export interface UserBranch {
  id: string;
  code?: string;
  name: string;
  primary?: boolean;
}

export interface User {
  id: string | number;
  username: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: UserStatus;
  primaryBranchId: string | null;
  primaryBranchName?: string;
  branches?: UserBranch[];
  roles?: string[];
  roleIds?: string[];
  department?: string;
  createdAt: string;
  updatedAt?: string;
  avatar?: string;
  note?: string;
}

export interface UserFilter {
  query?: string;
  status?: UserStatus | null;
  branchId?: string | null;
  pageIndex: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend' | null;
}

export interface UserFormDTO {
  fullName: string;
  email: string;
  username: string;
  phoneNumber?: string;
  password?: string;
  status: UserStatus;
  primaryBranchId: string | null;
  roleIds?: string[];
  department?: string;
  roles?: string[];
  note?: string;
}

// ── Backend (BE) response contracts for /api/v1/accounts ──
export interface AccountResponseBE {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  authProvider: string;
  hasLocalPassword: boolean;
  status: string;
  primaryBranchId: string | null;
  primaryBranchName?: string | null;
  branches?: UserBranch[];
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  roleIds?: string[];
  roles?: string[];
}

export interface PageResponseBE<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

export interface ApiResponseBE<T> {
  status: number;
  errorCode: string | null;
  message: string;
  data: T;
  timestamp: string;
}

/** Map trạng thái BE (EntityStatus) sang UserStatus (số) của FE. */
export function backendStatusToUserStatus(status: string | null | undefined): UserStatus {
  return status === 'ACTIVE' ? UserStatus.ACTIVE : UserStatus.INACTIVE;
}

/** Format Instant (ISO-8601) sang "YYYY-MM-DD HH:mm:ss" để hiển thị nhất quán. */
export function formatInstant(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export interface UserListResponse {
  items: User[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const USER_STATUS_OPTIONS = [
  {value: null, label: 'Tất cả trạng thái'},
  {value: UserStatus.ACTIVE, label: 'Đang hoạt động', badgeClass: 'tbl-badge--success'},
  {value: UserStatus.INACTIVE, label: 'Ngừng hoạt động', badgeClass: 'tbl-badge--danger'},
];

export function getUserStatusMeta(status: UserStatus | number): {
  label: string;
  badgeClass: string;
  tagColor: string;
  isActive: boolean;
} {
  if (status === UserStatus.ACTIVE || status === 1) {
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
