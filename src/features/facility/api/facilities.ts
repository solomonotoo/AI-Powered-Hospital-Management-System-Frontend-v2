import { api } from "@/lib/http";
import type { FacilityView, ReadinessItem, RegisterFacilityInput } from "../types";

// Platform facility registry API (blueprint 8.6). Every call is
// authorized again by the backend; the platform principal is derived
// from the access token, never from a header or the URL.

export async function listFacilities(): Promise<FacilityView[]> {
  const { data } = await api.get<FacilityView[]>("/api/v1/facilities");
  return data;
}

export async function getFacility(facilityId: string): Promise<FacilityView> {
  const { data } = await api.get<FacilityView>(`/api/v1/facilities/${facilityId}`);
  return data;
}

export async function getFacilityReadiness(facilityId: string): Promise<ReadinessItem[]> {
  const { data } = await api.get<ReadinessItem[]>(
    `/api/v1/facilities/${facilityId}/readiness`,
  );
  return data;
}

/**
 * RegisterFacility returns the new aggregate id under `facilityId`.
 * The facility starts in PROVISIONING; its first administrator is a
 * separate Day-0 use case.
 */
export async function registerFacility(input: RegisterFacilityInput): Promise<string> {
  const { data } = await api.post<{ facilityId: string }>("/api/v1/facilities", input);
  return data.facilityId;
}
