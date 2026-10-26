import { api } from "@/lib/http";
import type { OnboardStaffInput, StaffDetailView } from "../types";

// Staff API (blueprint 8.7). Every request is facility-scoped by the
// access token: none of these carry a facility id, so a caller cannot
// address another hospital's workforce by changing the URL.

/** POST /api/v1/staff — returns the new aggregate id under `staffId`. */
export async function onboardStaff(input: OnboardStaffInput): Promise<string> {
  const { data } = await api.post<{ staffId: string }>("/api/v1/staff", input);
  return data.staffId;
}

/** POST /api/v1/staff/{id}/link-user — one-time account attachment. */
export async function linkStaffUser(
  staffId: string,
  userId: string,
): Promise<void> {
  await api.post(`/api/v1/staff/${staffId}/link-user`, { userId });
}

/** GET /api/v1/staff/{id} — full workforce record. */
export async function getStaff(staffId: string): Promise<StaffDetailView> {
  const { data } = await api.get<StaffDetailView>(`/api/v1/staff/${staffId}`);
  return data;
}
