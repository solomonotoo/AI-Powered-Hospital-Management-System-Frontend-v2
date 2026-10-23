"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { facilityQueryKeys } from "@/features/facility/hooks/use-facilities";
import {
  configureSequence,
  getPrintProfile,
  getSequences,
  updatePrintProfile,
} from "../api/configuration";
import type { ConfigureSequenceInput, UpdatePrintProfileInput } from "../types";

// Query-key factory (blueprint 52). Sequence and print-profile changes
// can flip readiness, so the narrow readiness key is invalidated too —
// never the whole application cache.

export const configurationQueryKeys = {
  all: ["configuration"] as const,
  sequences: () => [...configurationQueryKeys.all, "sequences"] as const,
  printProfile: () => [...configurationQueryKeys.all, "print-profile"] as const,
};

export function useSequences(enabled = true) {
  return useQuery({
    queryKey: configurationQueryKeys.sequences(),
    queryFn: getSequences,
    enabled,
    staleTime: 15_000,
  });
}

export function useConfigureSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConfigureSequenceInput) => configureSequence(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: configurationQueryKeys.sequences(),
      });
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.currentReadiness(),
      });
    },
  });
}

export function usePrintProfile(enabled = true) {
  return useQuery({
    queryKey: configurationQueryKeys.printProfile(),
    queryFn: getPrintProfile,
    enabled,
    staleTime: 30_000,
  });
}

export function useUpdatePrintProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePrintProfileInput) => updatePrintProfile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: configurationQueryKeys.printProfile(),
      });
      void queryClient.invalidateQueries({
        queryKey: facilityQueryKeys.currentReadiness(),
      });
    },
  });
}
