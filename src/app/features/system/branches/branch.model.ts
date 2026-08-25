/**
 * Model quản trị Chi nhánh - khớp contract backend `/api/v1/branches`.
 * BE: BranchResponse / CreateBranchRequest / UpdateBranchRequest.
 */
export type BranchStatus = 'ACTIVE' | 'INACTIVE';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  supportsPickup?: boolean;
  supportsDelivery?: boolean;
  averagePreparationMinutes?: number;
  status: string;
  parentId?: string | null;
  parentName?: string | null;
}

export interface BranchPayload {
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  supportsPickup?: boolean;
  supportsDelivery?: boolean;
  averagePreparationMinutes?: number;
  status?: string | null;
  parentId?: string | null;
}

export const BRANCH_STATUS_ACTIVE: BranchStatus = 'ACTIVE';
export const BRANCH_STATUS_INACTIVE: BranchStatus = 'INACTIVE';

export const BRANCH_STATUS_OPTIONS = [
  { value: BRANCH_STATUS_INACTIVE, label: 'Ngừng hoạt động', badgeClass: 'tbl-badge--danger' },
  { value: BRANCH_STATUS_ACTIVE, label: 'Đang hoạt động', badgeClass: 'tbl-badge--success' },
];

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  ACTIVE: { label: 'Đang hoạt động', badgeClass: 'tbl-badge tbl-badge--success' },
  INACTIVE: { label: 'Ngừng hoạt động', badgeClass: 'tbl-badge tbl-badge--danger' },
};

export function getBranchStatusMeta(status: string | null | undefined): {
  label: string;
  badgeClass: string;
} {
  return (
    STATUS_META[status ?? ''] ?? {
      label: status || '—',
      badgeClass: 'tbl-badge tbl-badge--neutral',
    }
  );
}
