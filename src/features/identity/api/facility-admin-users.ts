import { api } from "@/lib/http";

// Platform-safe facility administrator summary. The endpoint is
// facility-scoped and platform-only on the backend; this client never
// sends a user directory query or a facility id from the body.

export interface FacilityAdminUserView {
  userId: string;
  username: string;
  accountStatus: string;
  staffLinked: boolean;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  roleCode: string;
  assignmentStatus: string;
  validFrom: string;
  validTo: string | null;
  bootstrapGrant: boolean;
}

export async function listFacilityAdminUsers(
  facilityId: string,
): Promise<FacilityAdminUserView[]> {
  const { data } = await api.get<FacilityAdminUserView[]>(
    `/api/v1/identity/facilities/${facilityId}/admin-users`,
  );
  return data;
}
