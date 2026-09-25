import { api } from "@/lib/http";
import { setMfaToken } from "@/lib/auth-store";
import type { LoginResponse } from "@/features/identity/api/auth";
import { setSession } from "@/lib/auth-store";

// MFA API: enrol shows the secret once, confirm latches it on,
// verify exchanges the 5-minute challenge for a full session.
// Recovery codes are accepted wherever a TOTP code is (server tries
// both) — the UI labels the field accordingly, never the mechanics.

// --- Enrol (authenticated) -------------------------------------------
export interface EnrolResponse {
  secret: string;
  provisioningUri: string;
}

export async function enrollMfa(): Promise<EnrolResponse> {
  const { data } = await api.post<EnrolResponse>("/api/v1/auth/mfa/enroll");
  return data;
}

export async function confirmMfa(code: string): Promise<{ recoveryCodes: string[] }> {
  const { data } = await api.post<{ recoveryCodes: string[] }>("/api/v1/auth/mfa/confirm", {
    code,
  });
  return data;
}

// --- Verify (public challenge) ----------------------------------------
export async function verifyMfa(mfaToken: string, code: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/v1/auth/mfa/verify", { mfaToken, code });
  setSession(data.accessToken, data.sessionId);
  setMfaToken(null);
  return data;
}
