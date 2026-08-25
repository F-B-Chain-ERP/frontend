export type PermField = 'access' | 'add' | 'edit' | 'delete';

export enum RoleStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  DELETED = 'deleted',
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  deleted: boolean;
  isDefault: boolean;
  accountCount: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface RoleDetail extends Role {
  userList?: RoleAssignedUser[];
}

export interface RoleAssignedUser {
  id: string | number;
  username: string;
  fullName: string;
  email: string;
  department?: string;
  assignedAt?: string;
}

export interface RoleFilter {
  query?: string;
  status?: 'active' | 'inactive' | 'deleted' | 'all';
  dateFrom?: Date | null;
  dateTo?: Date | null;
  pageIndex: number;
  pageSize: number;
}

export interface RoleFormDTO {
  id?: string;
  name: string;
  code?: string;
  description?: string;
  active: boolean;
  copyFromRoleId?: string;
}

export interface FunctionPermission {
  FunctionsId: number;
  ApplicationId: number;
  ParentId: number;
  FunctionsName: string;
  Path: string;
  FunctionUrl: string;
  Icon: string;
  Flag: number; // 0 or 1 - Quyền truy cập (access)
  OrderId: number;
  OnMenu: number;
  IsSystem: number;
  Help: string | null;
  Adds: number; // 0 or 1 - Quyền thêm (add)
  Del: number;  // 0 or 1 - Quyền xóa (delete)
  Edit: number; // 0 or 1 - Quyền sửa (edit)
  Res: number;
  Level: number;
  ListFunc: null;
  CanView?: boolean;   // action "truy cập" có tồn tại trên hệ thống
  CanAdd?: boolean;    // action "thêm" có tồn tại trên hệ thống
  CanEdit?: boolean;   // action "sửa" có tồn tại trên hệ thống
  CanDelete?: boolean; // action "xóa" có tồn tại trên hệ thống
}

export interface PermissionApiResponse<T> {
  Data: T;
  Message: string | null;
  Success: boolean;
  Pager: string | null;
  Id: number | null;
}

export interface PermissionTreeNode {
  key: string;
  name: string;
  icon?: string;
  path?: string;
  access: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  accessIndeterminate?: boolean;
  addIndeterminate?: boolean;
  editIndeterminate?: boolean;
  deleteIndeterminate?: boolean;
  level?: number;
  expand?: boolean;
  children?: PermissionTreeNode[];
  parent?: PermissionTreeNode;
  isLeaf?: boolean;
  moduleKey?: string;
}

export interface UpdatePermissionPayload {
  FunctionsId: number;
  Adds: number;
  Del: number;
  Edit: number;
  Flag: number;
  Res: number;
}

export type PermissionViewMode = 'matrix' | 'tree';

export interface ModulePermissionStats {
  moduleId: number;
  moduleName: string;
  icon: string;
  totalFunctions: number;
  activeFunctions: number;
  totalRights: number; // Flag + Adds + Edit + Del (max 4 per node)
  activeRights: number;
  percent: number;
}

export interface RoleApiResponse {
  Data: RoleApiItem[];
  Success: boolean;
  Message: string | null;
  Pager: string;
}

export interface RoleApiItem {
  GroupId: number;
  GroupName: string;
  StatusId: number;
  DonViSuDungId: number;
  CreatedDate: string;
  OrderId: number;
  RowNum: number;
}

export interface RoleSaveRequest {
  GroupId: string;
  GroupName: string;
  StatusId: number;
  DonViSuDungId: number;
  ApplicationId: number;
  OrderId?: number;
}

export interface RoleSaveResponse {
  Success: boolean;
  Message: string | null;
  ID: string | null;
}

export interface RoleUpdateStatusRequest {
  GroupIds: number;
  StatusId: number;
}

export interface RoleStatsKPI {
  total: number;
  active: number;
  inactive: number;
  system: number;
}

export const ROLE_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang hoạt động', badgeClass: 'tbl-badge--success' },
  { value: 'inactive', label: 'Ngừng hoạt động', badgeClass: 'tbl-badge--danger' },
  { value: 'deleted', label: 'Đã xóa', badgeClass: 'tbl-badge--neutral' },
];

export function getRoleStatusMeta(role: { active: boolean; deleted?: boolean; isDefault?: boolean }): {
  label: string;
  badgeClass: string;
  tagColor: string;
} {
  if (role.deleted) {
    return {
      label: 'Đã xóa',
      badgeClass: 'tbl-badge tbl-badge--neutral',
      tagColor: 'default',
    };
  }
  if (role.active) {
    return {
      label: 'Đang hoạt động',
      badgeClass: 'tbl-badge tbl-badge--success',
      tagColor: 'success',
    };
  }
  return {
    label: 'Ngừng hoạt động',
    badgeClass: 'tbl-badge tbl-badge--danger',
    tagColor: 'error',
  };
}

// ── Backend DTO types ──────────────────────────────────────────────────
export interface RoleResponseBE {
  id: string;
  code: string;
  name: string;
  description: string | null;
  roleType: string;
  status: string;
}

export interface PageResponseBE<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

export interface AccountSummaryBE {
  id: string;
  username: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  authProvider: string;
  hasLocalPassword: boolean;
  status: string;
  primaryBranchId: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RoleAssignmentResponseBE {
  id: string;
  accountId: string;
  roleId: string;
  scope: { id: string; scopeType: string; branchId: string | null } | null;
  status: string;
  assignedAt: string | null;
  expiresAt: string | null;
}

// ── Thành viên của một vai trò (GET /api/v1/roles/{id}/users) ────────
export interface RoleMemberResponseBE {
  id: string;
  username: string;
  fullName: string | null;
  email: string | null;
  department: string | null;
  assignedAt: string | null;
}
