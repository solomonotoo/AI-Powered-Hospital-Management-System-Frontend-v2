"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFacility,
  getFacilityReadiness,
  listFacilities,
  registerFacility,
} from "../api/facilities";
import { inviteFirstFacilityAdmin } from "@/features/identity/api/invite";
import type { RegisterFacilityInput } from "../types";

// Query-key factory (blueprint 52): mutations invalidate the narrowest
// key that can be stale. Facility metadata is not patient data, but a
// stale status still misleads the platform operator.

export const facilityQueryKeys = {
  all: ["facilities"] as const,
  list: () => [...facilityQueryKeys.all, "list"] as const,
  detail: (facilityId: string) => [...facilityQueryKeys.all, "detail", facilityId] as const,
  readiness: (facilityId: string) =>
    [...facilityQueryKeys.all, "readiness", facilityId] as const,
};

export function useFacilities(enabled = true) {
  return useQuery({
    queryKey: facilityQueryKeys.list(),
    queryFn: listFacilities,
    enabled,
    staleTime: 30_000,
  });
}

export function useFacility(facilityId: string, enabled = true) {
  return useQuery({
    queryKey: facilityQueryKeys.detail(facilityId),
    queryFn: () => getFacility(facilityId),
    enabled: enabled && facilityId.length > 0,
    staleTime: 30_000,
  });
}

export function useFacilityReadiness(facilityId: string, enabled = true) {
  return useQuery({
    queryKey: facilityQueryKeys.readiness(facilityId),
    queryFn: () => getFacilityReadiness(facilityId),
    enabled: enabled && facilityId.length > 0,
    staleTime: 15_000,
  });
}

export function useRegisterFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterFacilityInput) => registerFacility(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: facilityQueryKeys.list() });
    },
  });
}

/**
 * The first-admin endpoint is single-use. A successful call changes the
 * readiness answer (administrator present), so refresh that key; the
 * response token is never written to storage.
 */
export function useInviteFirstFacilityAdmin(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => inviteFirstFacilityAdmin(facilityId, email),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.readiness(facilityId),
      });
    },
  });
}
