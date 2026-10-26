"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionQueryKey } from "@/features/identity/hooks/use-session";
import { getStaff, linkStaffUser, onboardStaff } from "../api/staff";
import type { OnboardStaffInput } from "../types";

// Query-key factory (blueprint 52). The link mutation also refreshes the
// session because GET /identity/me carries `staffId`; the account side
// is latched by an async event, so the caller may still need to poll.

export const staffQueryKeys = {
  all: ["staff"] as const,
  detail: (staffId: string) =>
    [...staffQueryKeys.all, "detail", staffId] as const,
};

export function useStaff(staffId: string, enabled = true) {
  return useQuery({
    queryKey: staffQueryKeys.detail(staffId),
    queryFn: () => getStaff(staffId),
    enabled: enabled && staffId.length > 0,
    staleTime: 30_000,
  });
}

export function useOnboardStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OnboardStaffInput) => onboardStaff(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });
    },
  });
}

export function useLinkStaffUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      staffId,
      userId,
    }: {
      staffId: string;
      userId: string;
    }) => linkStaffUser(staffId, userId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: staffQueryKeys.detail(variables.staffId),
      });
      void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
  });
}
