import { api } from "@/lib/http";
import type { PagedResponse } from "@/lib/paged";
import type {
  AddStaffLicenceInput,
  AssignStaffUnitInput,
  ChangeEmploymentStatusInput,
  ExpiringLicenceView,
  OnboardStaffInput,
  StaffDetailView,
  StaffDirectoryParams,
  StaffSummaryView,
  UpdateStaffInput,
} from "../types";

// Staff API (blueprint 8.7). Every request is facility-scoped by the
// access token: none of these carry a facility id, so a caller cannot
// address another hospital's workforce by changing the URL.

/** GET /api/v1/staff — paged, facility-scoped directory search. */
export async function listStaff(
  params: StaffDirectoryParams = {},
): Promise<PagedResponse<StaffSummaryView>> {
  const { data } = await api.get<PagedResponse<StaffSummaryView>>(
    "/api/v1/staff",
    {
      params: {
        q: params.q ?? "",
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    },
  );
  return data;
}

/** POST /api/v1/staff — returns the new aggregate id under `staffId`. */
export async function onboardStaff(input: OnboardStaffInput): Promise<string> {
  const { data } = await api.post<{ staffId: string }>("/api/v1/staff", input);
  return data.staffId;
}

/** GET /api/v1/staff/{id} — full workforce record. */
export async function getStaff(staffId: string): Promise<StaffDetailView> {
  const { data } = await api.get<StaffDetailView>(`/api/v1/staff/${staffId}`);
  return data;
}

/** PUT /api/v1/staff/{id} — identity/contact profile edit (not category). */
export async function updateStaff(
  staffId: string,
  input: UpdateStaffInput,
): Promise<void> {
  await api.put(`/api/v1/staff/${staffId}`, input);
}

/** POST /api/v1/staff/{id}/licences — append a licence (renewal = new row). */
export async function addStaffLicence(
  staffId: string,
  input: AddStaffLicenceInput,
): Promise<void> {
  await api.post(`/api/v1/staff/${staffId}/licences`, input);
}

/** POST /api/v1/staff/{id}/assignments — append a unit posting. */
export async function assignStaffUnit(
  staffId: string,
  input: AssignStaffUnitInput,
): Promise<void> {
  await api.post(`/api/v1/staff/${staffId}/assignments`, input);
}

/** POST /api/v1/staff/{id}/status — guarded employment move with a reason. */
export async function changeStaffEmploymentStatus(
  staffId: string,
  input: ChangeEmploymentStatusInput,
): Promise<void> {
  await api.post(`/api/v1/staff/${staffId}/status`, input);
}

/** POST /api/v1/staff/{id}/link-user — one-time account attachment. */
export async function linkStaffUser(
  staffId: string,
  userId: string,
): Promise<void> {
  await api.post(`/api/v1/staff/${staffId}/link-user`, { userId });
}

/** GET /api/v1/staff/licences/expiring — dashboard licence alert list. */
export async function listExpiringLicences(): Promise<ExpiringLicenceView[]> {
  const { data } = await api.get<ExpiringLicenceView[]>(
    "/api/v1/staff/licences/expiring",
  );
  return data;
}
