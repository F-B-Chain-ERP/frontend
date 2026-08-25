/**
 * Model quản trị Phạm vi truy cập (Scope) - khớp contract backend `/api/v1/scopes`.
 * BE: ScopeAdminResponse / CreateScopeRequest / UpdateScopeRequest.
 * Quy ước BE: ALL_SYSTEM không gắn chi nhánh (branchId = null),
 * STORE / WAREHOUSE bắt buộc gắn chi nhánh.
 */
export type ScopeType = 'ALL_SYSTEM' | 'STORE' | 'WAREHOUSE';

export type ScopeStatus = 'ACTIVE' | 'INACTIVE';

export interface Scope {
  id: string;
  scopeType: ScopeType;
  branchId?: string | null;
  branchName?: string | null;
  status: string;
}

export interface ScopePayload {
  scopeType: ScopeType;
  branchId?: string | null;
  status?: string | null;
}

export const SCOPE_STATUS_ACTIVE: ScopeStatus = 'ACTIVE';
export const SCOPE_STATUS_INACTIVE: ScopeStatus = 'INACTIVE';

export interface ScopeTypeOption {
  value: ScopeType;
  label: string;
  badgeClass: string;
}

export const SCOPE_TYPE_OPTIONS: ScopeTypeOption[] = [
  { value: 'ALL_SYSTEM', label: 'Toàn hệ thống', badgeClass: 'tbl-badge--warning' },
  { value: 'STORE', label: 'Cửa hàng', badgeClass: 'tbl-badge--success' },
  { value: 'WAREHOUSE', label: 'Kho', badgeClass: 'tbl-badge--neutral' },
];

const SCOPE_TYPE_META: Record<ScopeType, { label: string; badgeClass: string }> = {
  ALL_SYSTEM: { label: 'Toàn hệ thống', badgeClass: 'tbl-badge tbl-badge--warning' },
  STORE: { label: 'Cửa hàng', badgeClass: 'tbl-badge tbl-badge--success' },
  WAREHOUSE: { label: 'Kho', badgeClass: 'tbl-badge tbl-badge--neutral' },
};

export function getScopeTypeMeta(scopeType: string | null | undefined): {
  label: string;
  badgeClass: string;
} {
  const meta = scopeType ? SCOPE_TYPE_META[scopeType as ScopeType] : undefined;
  return meta ?? { label: scopeType || '—', badgeClass: 'tbl-badge tbl-badge--neutral' };
}

export const SCOPE_STATUS_OPTIONS = [
  { value: SCOPE_STATUS_ACTIVE, label: 'Hoạt động', badgeClass: 'tbl-badge--success' },
  { value: SCOPE_STATUS_INACTIVE, label: 'Ngừng hoạt động', badgeClass: 'tbl-badge--danger' },
];

const SCOPE_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  ACTIVE: { label: 'Hoạt động', badgeClass: 'tbl-badge tbl-badge--success' },
  INACTIVE: { label: 'Ngừng hoạt động', badgeClass: 'tbl-badge tbl-badge--danger' },
};

export function getScopeStatusMeta(status: string | null | undefined): {
  label: string;
  badgeClass: string;
} {
  return (
    SCOPE_STATUS_META[status ?? ''] ?? {
      label: status || '—',
      badgeClass: 'tbl-badge tbl-badge--neutral',
    }
  );
}
