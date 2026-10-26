"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignRole,
  cloneRole,
  createRole,
  deleteRole,
  getRole,
  listPermissions,
  listRoles,
  updateRole,
} from "../api/roles";
import type {
  AssignRoleInput,
  CloneRoleInput,
  CreateRoleInput,
  RoleTier,
  UpdateRoleInput,
} from "../types/admin";
import { sessionQueryKey } from "./use-session";

export const roleQueryKeys = {
  all: ["identity", "roles"] as const,
  list: (tier?: RoleTier) => [...roleQueryKeys.all, "list", tier] as const,
  detail: (code: string) => [...roleQueryKeys.all, "detail", code] as const,
  permissions: () => ["identity", "permissions"] as const,
};

export function useRoles(tier?: RoleTier, enabled = true) {
  return useQuery({
    queryKey: roleQueryKeys.list(tier),
    queryFn: () => listRoles(tier),
    enabled,
    staleTime: 30_000,
  });
}

export function useRole(code: string, enabled = true) {
  return useQuery({
    queryKey: roleQueryKeys.detail(code),
    queryFn: () => getRole(code),
    enabled: enabled && code.length > 0,
    staleTime: 30_000,
  });
}

export function usePermissions(enabled = true) {
  return useQuery({
    queryKey: roleQueryKeys.permissions(),
    queryFn: listPermissions,
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => createRole(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roleQueryKeys.all });
    },
  });
}

export function useUpdateRole(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRoleInput) => updateRole(code, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: roleQueryKeys.detail(code),
      });
      void queryClient.invalidateQueries({ queryKey: roleQueryKeys.all });
    },
  });
}

export function useCloneRole(sourceCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CloneRoleInput) => cloneRole(sourceCode, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roleQueryKeys.all });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => deleteRole(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roleQueryKeys.all });
    },
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignRoleInput) => assignRole(input),
    onSuccess: () => {
      // The target user's next request resolves permissions from the
      // server; the current session only changes if this was a self
      // assignment, which the backend rejects. Refresh defensively.
      void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
  });
}
