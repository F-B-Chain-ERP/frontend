export enum UserStatus {
  INACTIVE = 0,
  ACTIVE = 1,
}

export interface User {
  id: string | number;
  username: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: UserStatus;
  roles?: string[];
  department?: string;
  createdAt: string;
  updatedAt?: string;
  avatar?: string;
  note?: string;
}

export interface UserFilter {
  query?: string;
  status?: UserStatus | null;
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
  status: UserStatus;
  department?: string;
  roles?: string[];
  note?: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const USER_STATUS_OPTIONS = [
  { value: null, label: 'Tất cả trạng thái' },
  { value: UserStatus.ACTIVE, label: 'Hoạt động', tagClass: 'ant-tag-success' },
  { value: UserStatus.INACTIVE, label: 'Ngừng hoạt động', tagClass: 'ant-tag-error' },
];

export function getUserStatusMeta(status: UserStatus | number): { label: string; tagClass: string; color: string } {
  if (status === UserStatus.ACTIVE || status === 1) {
    return { label: 'Đang hoạt động', tagClass: 'ant-tag-success', color: '#10b981' };
  }
  return { label: 'Ngừng hoạt động', tagClass: 'ant-tag-error', color: '#ef4444' };
}
