import { api } from "@/lib/http";
import { setSession } from "@/lib/auth-store";

// Identity API: thin mappers over the backend contract. No business
// logic here — routing decisions (MFA step? facility picker? forced
// reset?) live in use-auth.ts from the RESPONSE shape.

export interface LoginResponse {
  accessToken: string;
  sessionId: string;
  userId: string;
  username: string;
  accountType: "PLATFORM" | "STAFF";
  facilityId: string | null;
  facilities: string[];
  permissions: string[];
  mustChangePassword: boolean;
  mfaRequired: boolean;
  mfaToken: string | null;
}

export interface RefreshResponse {
  accessToken: string;
  facilityId: string | null;
  permissions: string[];
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/v1/auth/login", { username, password });
  if (!data.mfaRequired) setSession(data.accessToken, data.sessionId);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/v1/auth/logout");
  } finally {
    // Client state clears even if the server call fails — a dead
    // session server-side must still log the workstation out.
    const { clearSession } = await import("@/lib/auth-store");
    clearSession();
  }
}

export async function selectFacility(facilityId: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/v1/auth/select-facility", { facilityId });
  setSession(data.accessToken, data.sessionId);
  return data;
}
