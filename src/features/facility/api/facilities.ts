import { api } from "@/lib/http";
import type {
  FacilityView,
  ReadinessItem,
  RegisterFacilityInput,
  StatusHistoryEntry,
  UnitInput,
  UnitView,
  UpdateFacilityInput,
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

export async function updateCurrentFacility(
  input: UpdateFacilityInput,
): Promise<void> {
  await api.put("/api/v1/facilities/current", input);
}

export async function getCurrentFacilityUnits(): Promise<UnitView[]> {
  const { data } = await api.get<UnitView[]>("/api/v1/facilities/current/units");
  // The backend omits null parent ids from JSON; normalise once at the
  // boundary so the tree and the form can rely on the declared type.
  return data.map((unit) => ({ ...unit, parentUnitId: unit.parentUnitId ?? null }));
}

export async function createUnit(input: UnitInput): Promise<string> {
  const { data } = await api.post<{ unitId: string }>(
    "/api/v1/facilities/current/units",
    input,
  );
  return data.unitId;
}

export async function updateUnit(unitId: string, input: UnitInput): Promise<void> {
  await api.put(`/api/v1/facilities/current/units/${unitId}`, input);
}

export async function deactivateUnit(
  unitId: string,
  reason: string,
): Promise<void> {
  await api.post(`/api/v1/facilities/current/units/${unitId}/deactivate`, {
    reason,
  });
}

export async function applyUnitTemplate(): Promise<void> {
  await api.post("/api/v1/facilities/current/units/apply-template");
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
