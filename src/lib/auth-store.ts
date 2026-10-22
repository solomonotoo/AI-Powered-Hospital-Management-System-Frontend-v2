import { env } from "./env";

// In-memory auth state. WHY module state, not localStorage/context:
// the access token must never touch persistent storage (XSS steals
// localStorage); React context would force every consumer to re-render
// on token rotation. A tiny external store + explicit subscribers gives
// both safety and control. The refresh secret lives ONLY in the
// HttpOnly cookie (server-set, JS-invisible) — this file never sees it.
//
// ONE exception to "nothing persistent": the session id. It is a random
// identifier, not a credential (the server still requires the HttpOnly
// refresh cookie), and the refresh endpoint needs it in the request
// body. Without it a page reload could not resume the session, so it is
// stored under a non-secret key. Never store tokens here.

type Listener = () => void;

const SESSION_ID_STORAGE_KEY = "hms.session-id";

function readPersistedSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_ID_STORAGE_KEY);
  } catch {
    // Storage can be disabled (private mode / policy). The session then
    // simply does not survive a reload; nothing else breaks.
    return null;
  }
}

function persistSessionId(session: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (session) window.localStorage.setItem(SESSION_ID_STORAGE_KEY, session);
    else window.localStorage.removeItem(SESSION_ID_STORAGE_KEY);
  } catch {
    // See readPersistedSessionId.
  }
}

let accessToken: string | null = null;
let sessionId: string | null = readPersistedSessionId();
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getSessionId(): string | null {
  return sessionId;
}

export function setSession(access: string | null, session: string | null): void {
  accessToken = access;
  sessionId = session;
  persistSessionId(session);
  notify();
}

export function clearSession(): void {
  setSession(null, null);
}

// MFA challenge token: in-memory like the access token (5-minute,
// single-purpose — never persisted anywhere).
let mfaToken: string | null = null;

export function setMfaToken(token: string | null): void {
  mfaToken = token;
  notify();
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
// features/identity/hooks/use-session.ts), never localStorage.
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
