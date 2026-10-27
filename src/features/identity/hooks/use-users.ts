"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  disableUser,
  enableUser,
  getUser,
  inviteUser,
  listUserAssignments,
  listUserSessions,
  listUsers,
  resetUserMfa,
  resetUserPassword,
  revokeUserSessions,
  unlockUser,
} from "../api/users";
import type { InviteUserInput, UserListParams } from "../types/admin";

export const userQueryKeys = {
  all: ["identity", "users"] as const,
  list: (params: UserListParams) =>
    [...userQueryKeys.all, "list", params] as const,
  detail: (userId: string) =>
    [...userQueryKeys.all, "detail", userId] as const,
  assignments: (userId: string, params: UserListParams) =>
    [...userQueryKeys.all, "assignments", userId, params] as const,
  sessions: (userId: string, params: UserListParams) =>
    [...userQueryKeys.all, "sessions", userId, params] as const,
};

export function useUsers(params: UserListParams, enabled = true) {
  return useQuery({
    queryKey: userQueryKeys.list(params),
    queryFn: () => listUsers(params),
    enabled,
    staleTime: 15_000,
  });
}

export function useUser(userId: string, enabled = true) {
  return useQuery({
    queryKey: userQueryKeys.detail(userId),
    queryFn: () => getUser(userId),
    enabled: enabled && userId.length > 0,
    staleTime: 30_000,
  });
}

export function useUserAssignments(
  userId: string,
  params: UserListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: userQueryKeys.assignments(userId, params),
    queryFn: () => listUserAssignments(userId, params),
    enabled: enabled && userId.length > 0,
    staleTime: 15_000,
  });
}

export function useUserSessions(
  userId: string,
  params: UserListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: userQueryKeys.sessions(userId, params),
    queryFn: () => listUserSessions(userId, params),
    enabled: enabled && userId.length > 0,
    staleTime: 15_000,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteUserInput) => inviteUser(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

function useUserAction<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

export function useResetUserPassword() {
  return useUserAction((userId: string) => resetUserPassword(userId));
}

export function useDisableUser() {
  return useUserAction((userId: string) => disableUser(userId));
}

export function useEnableUser() {
  return useUserAction((userId: string) => enableUser(userId));
}

export function useUnlockUser() {
  return useUserAction((userId: string) => unlockUser(userId));
}

export function useResetUserMfa() {
  return useUserAction((userId: string) => resetUserMfa(userId));
}

export function useRevokeUserSessions() {
  return useUserAction((userId: string) => revokeUserSessions(userId));
}
