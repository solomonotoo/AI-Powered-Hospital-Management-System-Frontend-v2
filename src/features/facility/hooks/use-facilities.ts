"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyUnitTemplate,
  createUnit,
  deactivateUnit,
  getCurrentFacility,
  getCurrentFacilityReadiness,
  getCurrentFacilityUnits,
  getFacility,
  getFacilityReadiness,
  getFacilityStatusHistory,
  listFacilities,
  registerFacility,
  requestGoLive,
  updateCurrentFacility,
  updateUnit,
} from "../api/facilities";
import { inviteFirstFacilityAdmin } from "@/features/identity/api/invite";
import { facilityAdminUserQueryKeys } from "@/features/identity/hooks/use-facility-admin-users";
import type {
  RegisterFacilityInput,
  UnitInput,
  UpdateFacilityInput,
} from "../types";

// Query-key factory (blueprint 52): mutations invalidate the narrowest
// key that can be stale. Facility metadata is not patient data, but a
// stale status still misleads the platform operator.

export const facilityQueryKeys = {
  all: ["facilities"] as const,
  list: () => [...facilityQueryKeys.all, "list"] as const,
  detail: (facilityId: string) => [...facilityQueryKeys.all, "detail", facilityId] as const,
  readiness: (facilityId: string) =>
    [...facilityQueryKeys.all, "readiness", facilityId] as const,
  statusHistory: (facilityId: string) =>
    [...facilityQueryKeys.all, "status-history", facilityId] as const,
  current: () => [...facilityQueryKeys.all, "current"] as const,
  currentReadiness: () =>
    [...facilityQueryKeys.all, "current", "readiness"] as const,
  currentUnits: () => [...facilityQueryKeys.all, "current", "units"] as const,
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

export function useFacilityStatusHistory(facilityId: string, enabled = true) {
  return useQuery({
    queryKey: facilityQueryKeys.statusHistory(facilityId),
    queryFn: () => getFacilityStatusHistory(facilityId),
    enabled: enabled && facilityId.length > 0,
    staleTime: 30_000,
  });
}

export function useCurrentFacility(enabled = true) {
  return useQuery({
    queryKey: facilityQueryKeys.current(),
    queryFn: getCurrentFacility,
    enabled,
    staleTime: 30_000,
  });
}

export function useCurrentFacilityReadiness(enabled = true) {
  return useQuery({
    queryKey: facilityQueryKeys.currentReadiness(),
    queryFn: getCurrentFacilityReadiness,
    enabled,
    staleTime: 15_000,
  });
}

export function useCurrentFacilityUnits(enabled = true) {
  return useQuery({
    queryKey: facilityQueryKeys.currentUnits(),
    queryFn: getCurrentFacilityUnits,
    enabled,
    staleTime: 15_000,
  });
}

export function useUpdateCurrentFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateFacilityInput) => updateCurrentFacility(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: facilityQueryKeys.current() });
    },
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UnitInput) => createUnit(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.currentUnits(),
      });
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.currentReadiness(),
      });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ unitId, input }: { unitId: string; input: UnitInput }) =>
      updateUnit(unitId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.currentUnits(),
      });
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.currentReadiness(),
      });
    },
  });
}

export function useDeactivateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ unitId, reason }: { unitId: string; reason: string }) =>
      deactivateUnit(unitId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.currentUnits(),
      });
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.currentReadiness(),
      });
    },
  });
}

export function useApplyUnitTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyUnitTemplate,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.currentUnits(),
      });
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.currentReadiness(),
      });
    },
  });
}

/**
 * Taking a facility live is a one-way status change (PROVISIONING or
 * CONFIGURED → LIVE). No optimistic update: the server re-runs the
 * readiness checklist, and the next facility read is authoritative.
 */
export function useRequestGoLive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestGoLive,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: facilityQueryKeys.current() });
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.currentReadiness(),
      });
    },
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
      void queryClient.invalidateQueries({
        queryKey: facilityAdminUserQueryKeys.list(facilityId),
      });
    },
  });
}
