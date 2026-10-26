"use client";

import { useQuery } from "@tanstack/react-query";
import { getAuditUserActivity, searchAuditEvents } from "../api/audit";
import type { AuditSearchParams, UserActivityParams } from "../types";

export const auditQueryKeys = {
  all: ["audit"] as const,
  search: (params: AuditSearchParams) =>
    [...auditQueryKeys.all, "search", params] as const,
  userActivity: (userId: string, params: UserActivityParams) =>
    [...auditQueryKeys.all, "user", userId, params] as const,
};

export function useAuditEvents(
  params: AuditSearchParams,
  enabled = true,
) {
  return useQuery({
    queryKey: auditQueryKeys.search(params),
    queryFn: () => searchAuditEvents(params),
    enabled,
    staleTime: 15_000,
  });
}

export function useUserActivity(
  userId: string,
  params: UserActivityParams,
  enabled = true,
) {
  return useQuery({
    queryKey: auditQueryKeys.userActivity(userId, params),
    queryFn: () => getAuditUserActivity(userId, params),
    enabled: enabled && userId.length > 0,
    staleTime: 15_000,
  });
}
