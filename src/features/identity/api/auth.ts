import { api } from "@/lib/http";
import { clearSession, setMfaToken, setSession } from "@/lib/auth-store";

// Identity API: thin mappers over the backend contract. No business
// logic here — routing decisions (MFA step? facility picker? forced
// reset?) live in use-auth.ts from the RESPONSE shape.

/**
 * The backend omits tokens on an MFA challenge (there is no session
 * yet), so those fields are nullable in the wire contract. Consumers
 * must branch on `mfaRequired` before reading them.
 */
export interface LoginResponse {
  accessToken?: string | null;
  sessionId?: string | null;
  userId: string;
  username: string;
  accountType: "PLATFORM" | "STAFF";
  facilityId: string | null;
  facilities: string[];
  permissions: string[];
  mustChangePassword: boolean;
  mfaRequired: boolean;
  mfaToken?: string | null;
}

export interface RefreshResponse {
  accessToken: string;
  facilityId: string | null;
  permissions: string[];
}

/** Store a completed authentication result (never a challenge). */
function applySession(data: LoginResponse): void {
  if (data.accessToken && data.sessionId) {
    setSession(data.accessToken, data.sessionId);
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/v1/auth/login", { username, password });
  if (!data.mfaRequired) applySession(data);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/v1/auth/logout");
  } finally {
    // Client state clears even if the server call fails — a dead
    // session server-side must still log the workstation out.
    clearSession();
    setMfaToken(null);
  }
}

export async function selectFacility(facilityId: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/v1/auth/select-facility", { facilityId });
  applySession(data);
  return data;
}
