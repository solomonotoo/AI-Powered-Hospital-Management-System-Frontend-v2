import { z } from "zod";
import type {
  AssignRoleInput,
  CloneRoleInput,
  CreateRoleInput,
  PermissionView,
  RoleTier,
  UpdateRoleInput,
} from "../types/admin";

const ROLE_CODE = /^[A-Z][A-Z0-9_]{2,49}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const inviteUserSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

export const roleCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters")
    .max(50, "Use 50 characters or fewer")
    .regex(
      ROLE_CODE,
      "Use upper-case letters, numbers and underscores, starting with a letter",
    ),
  name: z
    .string()
    .trim()
    .min(1, "Enter a role name")
    .max(120, "Use 120 characters or fewer"),
  permissions: z.array(z.string()),
});

export type RoleCreateFormValues = z.infer<typeof roleCreateSchema>;

export const roleEditSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a role name")
    .max(120, "Use 120 characters or fewer"),
  permissions: z.array(z.string()),
});

export type RoleEditFormValues = z.infer<typeof roleEditSchema>;

export const cloneRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters")
    .max(50, "Use 50 characters or fewer")
    .regex(
      ROLE_CODE,
      "Use upper-case letters, numbers and underscores, starting with a letter",
    ),
  name: z
    .string()
    .trim()
    .min(1, "Enter a role name")
    .max(120, "Use 120 characters or fewer"),
});

export type CloneRoleFormValues = z.infer<typeof cloneRoleSchema>;

export function toCreateRoleInput(
  values: RoleCreateFormValues,
  tier: RoleTier = "FACILITY",
): CreateRoleInput {
  return {
    code: values.code,
    name: values.name,
    tier,
    permissions: values.permissions,
  };
}

export function toUpdateRoleInput(
  values: RoleEditFormValues,
): UpdateRoleInput {
  return { name: values.name, permissions: values.permissions };
}

export function toCloneRoleInput(
  values: CloneRoleFormValues,
): CloneRoleInput {
  return { code: values.code, name: values.name };
}

const optionalDate = z
  .string()
  .trim()
  .pipe(
    z.union([
      z.literal(""),
      z
        .string()
        .regex(ISO_DATE, "Enter a valid date")
        .refine((value) => {
          const parsed = new Date(`${value}T00:00:00Z`);
          return !Number.isNaN(parsed.getTime());
        }, "Enter a valid date"),
    ]),
  );

export const assignRoleSchema = z
  .object({
    roleCode: z.string().trim().min(1, "Choose a role"),
    unitId: z.string().trim().optional(),
    validFrom: optionalDate,
    validTo: optionalDate,
  })
  .superRefine((values, context) => {
    if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
      context.addIssue({
        code: "custom",
        path: ["validTo"],
        message: "End date cannot be before the start date",
      });
    }
  });

export type AssignRoleFormValues = z.infer<typeof assignRoleSchema>;

function instantOf(date: string): string {
  return new Date(`${date}T00:00:00Z`).toISOString();
}

/** Backend validity checks are inclusive, so a date-only end date covers the full day. */
function endOfDayInstantOf(date: string): string {
  return new Date(`${date}T23:59:59.999Z`).toISOString();
}

export function toAssignRoleInput(
  values: AssignRoleFormValues,
  userId: string,
  facilityId: string,
): AssignRoleInput {
  return {
    userId,
    roleCode: values.roleCode,
    facilityId,
    unitId: values.unitId || null,
    validFrom: values.validFrom ? instantOf(values.validFrom) : null,
    validTo: values.validTo ? endOfDayInstantOf(values.validTo) : null,
  };
}

export interface PermissionGroup {
  module: string;
  permissions: PermissionView[];
}

/** Group the catalogue for the role editor; modules sort alphabetically. */
export function groupPermissions(
  permissions: PermissionView[],
): PermissionGroup[] {
  const groups = new Map<string, PermissionView[]>();
  for (const permission of permissions) {
    const moduleName = permission.module?.trim() || "OTHER";
    const current = groups.get(moduleName) ?? [];
    current.push(permission);
    groups.set(moduleName, current);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([moduleName, rows]) => ({
      module: moduleName,
      permissions: [...rows].sort((left, right) =>
        left.code.localeCompare(right.code),
      ),
    }));
}
