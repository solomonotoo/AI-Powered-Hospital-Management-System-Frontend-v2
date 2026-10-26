import { api } from "@/lib/http";
import type {
  AssignRoleInput,
  AssignRoleResult,
  CloneRoleInput,
  CreateRoleInput,
  PermissionView,
  RoleTier,
  RoleView,
  UpdateRoleInput,
} from "../types/admin";

// Role administration (blueprint 8.6). Roles are definitions; a role
// carries no facility. Assignments carry scope and are granted through
// the separate assign call below.

export async function listRoles(tier?: RoleTier): Promise<RoleView[]> {
  const { data } = await api.get<RoleView[]>("/api/v1/identity/roles", {
    params: tier ? { tier } : undefined,
  });
  return data;
}

export async function getRole(code: string): Promise<RoleView> {
  const { data } = await api.get<RoleView>(
    `/api/v1/identity/roles/${encodeURIComponent(code)}`,
  );
  return data;
}

export async function listPermissions(): Promise<PermissionView[]> {
  const { data } = await api.get<PermissionView[]>(
    "/api/v1/identity/permissions",
  );
  return data;
}

export async function createRole(input: CreateRoleInput): Promise<void> {
  await api.post("/api/v1/identity/roles", input);
}

export async function updateRole(
  code: string,
  input: UpdateRoleInput,
): Promise<void> {
  await api.put(
    `/api/v1/identity/roles/${encodeURIComponent(code)}`,
    input,
  );
}

export async function cloneRole(
  sourceCode: string,
  input: CloneRoleInput,
): Promise<void> {
  await api.post(
    `/api/v1/identity/roles/${encodeURIComponent(sourceCode)}/clone`,
    input,
  );
}

export async function deleteRole(code: string): Promise<void> {
  await api.delete(`/api/v1/identity/roles/${encodeURIComponent(code)}`);
}

export async function assignRole(
  input: AssignRoleInput,
): Promise<AssignRoleResult> {
  const { data } = await api.post<AssignRoleResult>(
    "/api/v1/identity/assignments",
    input,
  );
  return data;
}
