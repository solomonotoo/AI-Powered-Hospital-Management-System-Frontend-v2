"use client";

import { useQuery } from "@tanstack/react-query";
import { listFacilityAdminUsers } from "../api/facility-admin-users";

// Query-key factory for the platform facility-detail "Admin users" tab.
// The invite mutation invalidates this narrow key so a newly provisioned
// first administrator appears without a full-page refresh.
export const facilityAdminUserQueryKeys = {
  all: ["identity", "facility-admin-users"] as const,
  list: (facilityId: string) =>
    [...facilityAdminUserQueryKeys.all, facilityId] as const,
};

export function useFacilityAdminUsers(facilityId: string, enabled = true) {
  return useQuery({
    queryKey: facilityAdminUserQueryKeys.list(facilityId),
    queryFn: () => listFacilityAdminUsers(facilityId),
    enabled: enabled && facilityId.length > 0,
    staleTime: 30_000,
  });
}
