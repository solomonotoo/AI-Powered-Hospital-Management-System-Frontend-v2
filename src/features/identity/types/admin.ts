// Identity administration contracts mirrored from the backend
// (UserAdminController, RoleAdminController). These are admin-console
// views only: no password hashes, MFA secrets or session tokens live in
// any of these shapes.

export const ACCOUNT_TYPES = ["PLATFORM", "STAFF"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  PLATFORM: "Platform",
  STAFF: "Staff",
};

export const ACCOUNT_STATUSES = [
  "INVITED",
  "ACTIVE",
  "LOCKED",
  "DISABLED",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  INVITED: "Invited",
  ACTIVE: "Active",
  LOCKED: "Locked",
  DISABLED: "Disabled",
};

/** GET /api/v1/identity/users (mirrors UserView). */
export interface UserView {
  id: string;
  username: string;
  accountType: AccountType;
  status: AccountStatus;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  staffId: string | null;
  lastLoginAt: string | null;
}

/** POST /api/v1/identity/users/invite. */
export interface InviteUserInput {
  email: string;
}

/** Invite and admin-reset both return a one-time token. */
export interface InvitationTokenView {
  invitationToken: string;
}

export const ROLE_TIERS = ["PLATFORM", "FACILITY"] as const;
export type RoleTier = (typeof ROLE_TIERS)[number];

export const ROLE_TIER_LABELS: Record<RoleTier, string> = {
  PLATFORM: "Platform",
  FACILITY: "Facility",
};

/** GET /api/v1/identity/roles (mirrors RoleView). */
export interface RoleView {
  code: string;
  name: string;
  tier: RoleTier;
  systemTemplate: boolean;
  permissions: string[];
}

/** GET /api/v1/identity/permissions (mirrors PermissionView). */
export interface PermissionView {
  code: string;
  module: string;
  description: string;
  sensitivity: "NORMAL" | "SENSITIVE" | "PRIVILEGED";
  requiresReason: boolean;
}

export interface CreateRoleInput {
  code: string;
  name: string;
  tier: RoleTier;
  permissions: string[];
}

export interface UpdateRoleInput {
  name: string;
  permissions: string[];
}

export interface CloneRoleInput {
  code: string;
  name: string;
}

/** POST /api/v1/identity/assignments (AssignRoleRequest). */
export interface AssignRoleInput {
  userId: string;
  roleCode: string;
  facilityId: string;
  unitId?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface AssignRoleResult {
  assignmentId: string;
}

export interface UserListParams {
  page?: number;
  size?: number;
}
