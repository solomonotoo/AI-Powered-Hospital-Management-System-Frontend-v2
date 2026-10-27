import type { components } from "@/api/generated/openapi-types";
import { api } from "@/lib/http";
import { normalizePaged, type PagedResponse } from "@/lib/paged";
import type {
  InvitationTokenView,
  InviteUserInput,
  UserAssignmentView,
  UserListParams,
  UserSessionView,
  UserView,
} from "../types/admin";

// User administration (blueprint 8.6). Identity is the only module that
// owns account lifecycle; these calls never carry a password or a
// facility id (facility scope comes from the access token).

export async function listUsers(
  params: UserListParams = {},
): Promise<PagedResponse<UserView>> {
  const { data } = await api.get<PagedResponse<UserView>>(
    "/api/v1/identity/users",
    {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    },
  );
  return data;
}

export async function getUser(userId: string): Promise<UserView> {
  const { data } = await api.get<UserView>(
    `/api/v1/identity/users/${userId}`,
  );
  return data;
}

export async function inviteUser(
  input: InviteUserInput,
): Promise<InvitationTokenView> {
  const { data } = await api.post<InvitationTokenView>(
    "/api/v1/identity/users/invite",
    input,
  );
  return data;
}

export async function resetUserPassword(
  userId: string,
): Promise<InvitationTokenView> {
  const { data } = await api.post<InvitationTokenView>(
    `/api/v1/identity/users/${userId}/reset-password`,
  );
  return data;
}

export async function disableUser(userId: string): Promise<void> {
  await api.post(`/api/v1/identity/users/${userId}/disable`);
}

export async function enableUser(userId: string): Promise<void> {
  await api.post(`/api/v1/identity/users/${userId}/enable`);
}

export async function unlockUser(userId: string): Promise<void> {
  await api.post(`/api/v1/identity/users/${userId}/unlock`);
}

export async function resetUserMfa(userId: string): Promise<void> {
  await api.post(`/api/v1/identity/users/${userId}/mfa-reset`);
}

/** Facility-scoped assignment history for the user-detail access tab. */
export async function listUserAssignments(
  userId: string,
  params: UserListParams = {},
): Promise<PagedResponse<UserAssignmentView>> {
  const { data } = await api.get<
    components["schemas"]["PagedResponseUserAssignmentView"]
  >(`/api/v1/identity/users/${userId}/assignments`, {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });
  return normalizePaged(data);
}

/** Usable sessions at the caller's facility, with the caller's row marked. */
export async function listUserSessions(
  userId: string,
  params: UserListParams = {},
): Promise<PagedResponse<UserSessionView>> {
  const { data } = await api.get<
    components["schemas"]["PagedResponseUserSessionView"]
  >(`/api/v1/identity/users/${userId}/sessions`, {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });
  return normalizePaged(data);
}

/**
 * Revoke every usable session for this account at the caller's facility.
 * The backend also allows a user to revoke their own sessions without
 * IDENTITY_SESSION_REVOKE; other facilities' sessions are untouched.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  await api.delete(`/api/v1/identity/users/${userId}/sessions`);
}
