"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionQueryKey } from "@/features/identity/hooks/use-session";
import {
  addStaffLicence,
  assignStaffUnit,
  changeStaffEmploymentStatus,
  getStaff,
  linkStaffUser,
  listExpiringLicences,
  listStaff,
  onboardStaff,
  updateStaff,
} from "../api/staff";
import type {
  AddStaffLicenceInput,
  AssignStaffUnitInput,
  ChangeEmploymentStatusInput,
  OnboardStaffInput,
  StaffDirectoryParams,
  UpdateStaffInput,
} from "../types";

// Query-key factory (blueprint 52). The link mutation also refreshes the
// session because GET /identity/me carries `staffId`; the account side
// is latched by an async event, so the caller may still need to poll.

export const staffQueryKeys = {
  all: ["staff"] as const,
  list: (params: StaffDirectoryParams) =>
    [...staffQueryKeys.all, "list", params] as const,
  detail: (staffId: string) =>
    [...staffQueryKeys.all, "detail", staffId] as const,
  expiring: () => [...staffQueryKeys.all, "expiring"] as const,
};

export function useStaffDirectory(
  params: StaffDirectoryParams,
  enabled = true,
) {
  return useQuery({
    queryKey: staffQueryKeys.list(params),
    queryFn: () => listStaff(params),
    enabled,
    staleTime: 15_000,
  });
}

export function useStaff(staffId: string, enabled = true) {
  return useQuery({
    queryKey: staffQueryKeys.detail(staffId),
    queryFn: () => getStaff(staffId),
    enabled: enabled && staffId.length > 0,
    staleTime: 30_000,
  });
}

export function useExpiringLicences(enabled = true) {
  return useQuery({
    queryKey: staffQueryKeys.expiring(),
    queryFn: listExpiringLicences,
    enabled,
    staleTime: 60_000,
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

export function useUpdateStaff(staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateStaffInput) => updateStaff(staffId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: staffQueryKeys.detail(staffId),
      });
      void queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });
    },
  });
}

export function useAddStaffLicence(staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddStaffLicenceInput) =>
      addStaffLicence(staffId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: staffQueryKeys.detail(staffId),
      });
      void queryClient.invalidateQueries({
        queryKey: staffQueryKeys.expiring(),
      });
      void queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });
    },
  });
}

export function useAssignStaffUnit(staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignStaffUnitInput) =>
      assignStaffUnit(staffId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: staffQueryKeys.detail(staffId),
      });
      void queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });
    },
  });
}

export function useChangeStaffEmploymentStatus(staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ChangeEmploymentStatusInput) =>
      changeStaffEmploymentStatus(staffId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: staffQueryKeys.detail(staffId),
      });
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
