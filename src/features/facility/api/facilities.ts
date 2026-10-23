import { api } from "@/lib/http";
import type {
  FacilityView,
  ReadinessItem,
  RegisterFacilityInput,
  StatusHistoryEntry,
} from "../types";

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

export async function getFacilityStatusHistory(
  facilityId: string,
): Promise<StatusHistoryEntry[]> {
  const { data } = await api.get<StatusHistoryEntry[]>(
    `/api/v1/facilities/${facilityId}/status-history`,
  );
  return data;
}

// Facility-side setup API. These endpoints carry no facility id: the
// backend reads the caller's facility from the access token (`fid`), so
// a cross-facility call is inexpressible here.

export async function getCurrentFacility(): Promise<FacilityView> {
  const { data } = await api.get<FacilityView>("/api/v1/facilities/current");
  return data;
}

export async function getCurrentFacilityReadiness(): Promise<ReadinessItem[]> {
  const { data } = await api.get<ReadinessItem[]>(
    "/api/v1/facilities/current/readiness",
  );
  return data;
}

/**
 * GoLive is readiness-gated by the backend: a 422 `READINESS_FAILED`
 * problem means the checklist changed between the read and the command.
 */
export async function requestGoLive(): Promise<void> {
  await api.post("/api/v1/facilities/current/go-live");
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
