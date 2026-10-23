import { api } from "@/lib/http";

// Invitation + self-service reset API. All responses are silent by
// design (unknown emails, spent links) — the UI shows the same
// confirmation regardless; the server never confirms or denies.

export async function acceptInvite(token: string, password: string): Promise<void> {
  await api.post("/api/v1/auth/accept-invite", { token, password });
}

export async function forgotPassword(username: string): Promise<void> {
  await api.post("/api/v1/auth/forgot-password", { username });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post("/api/v1/auth/reset-password", { token, newPassword });
}

/**
 * Day-0 provisioning: invite a facility's FIRST administrator.
 *
 * The facility comes from the path (never the body), and the backend
 * grants the bootstrap FACILITY_ADMIN assignment atomically. The
 * response carries the single-use invitation token the platform owner
 * forwards manually until the notification module exists.
 */
export interface FirstAdminResponse {
  userId: string;
  assignmentId: string;
  invitationToken: string;
}

export async function inviteFirstFacilityAdmin(
  facilityId: string,
  email: string,
): Promise<FirstAdminResponse> {
  const { data } = await api.post<FirstAdminResponse>(
    `/api/v1/identity/facilities/${facilityId}/first-admin`,
    { email },
  );
  return data;
}
