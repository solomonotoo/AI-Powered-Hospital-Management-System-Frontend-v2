import { env } from "./env";

// In-memory auth state. WHY module state, not localStorage/context:
// the access token must never touch persistent storage (XSS steals
// localStorage); React context would force every consumer to re-render
// on token rotation. A tiny external store + explicit subscribers gives
// both safety and control. The refresh secret lives ONLY in the
// HttpOnly cookie (server-set, JS-invisible) — this file never sees it.

type Listener = () => void;

let accessToken: string | null = null;
let sessionId: string | null = null;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function getSessionId(): string | null {
  return sessionId;
}

export function setSession(access: string | null, session: string | null): void {
  accessToken = access;
  sessionId = session;
  listeners.forEach((notify) => notify());
}

export function clearSession(): void {
  setSession(null, null);
}

// MFA challenge token: in-memory like the access token (5-minute,
// single-purpose — never persisted anywhere).
let mfaToken: string | null = null;

export function setMfaToken(token: string | null): void {
  mfaToken = token;
}

export function getMfaToken(): string | null {
  return mfaToken;
}

export function subscribeAuth(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Session payload (GET /identity/me) — cached by TanStack Query (see
// features/identity/hooks/use-session.ts in Slice 2), never localStorage.
export interface Session {
  userId: string;
  username: string;
  accountType: "PLATFORM" | "STAFF";
  staffId: string | null;
  mustChangePassword: boolean;
  facilityId: string | null;
  facilities: string[];
  permissions: string[];
}

export function apiUrl(path: string): string {
  return `${env.API_URL}${path}`;
}
