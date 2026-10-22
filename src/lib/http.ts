import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearSession, getAccessToken, getSessionId, setSession } from "./auth-store";
import { env } from "./env";

// Single axios instance for the whole app.
//
// Auth model (matches the backend):
// - Access token: Authorization header, from memory (auth-store).
// - Refresh: HttpOnly cookie (withCredentials) + sessionId from memory
//   (persisted as a non-secret identifier so a reload can resume).
// - NO X-Facility-Id header (facility rides inside the JWT as `fid`).
// - Errors are RFC 7807 problem bodies (code/message/traceId/fieldErrors).

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export interface ProblemBody {
  code?: string;
  message?: string;
  traceId?: string | null;
  fieldErrors?: Array<{ field?: string | null; message?: string | null }>;
  status?: number;
}

export function problemOf(error: unknown): ProblemBody {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ProblemBody | undefined;
    if (data && typeof data === "object") return data;
    return { message: error.message };
  }
  return { message: "Unexpected error" };
}

export const PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED";

export const api = axios.create({
  baseURL: env.API_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  // Send the HttpOnly refresh cookie on auth calls.
  withCredentials: true,
});

// Refresh WITHOUT the interceptors (else /refresh could recurse).
const refreshApi = axios.create({
  baseURL: env.API_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Requests where a 401 means "wrong credentials entered", NOT "the
// session expired". Refreshing and retrying these would either repeat
// the same failure or (worse) log the user out for a typo.
const CREDENTIAL_CHECKS = [
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/mfa/verify",
  "/api/v1/auth/change-password",
  "/api/v1/auth/accept-invite",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
];

function isCredentialCheck(url: string | undefined): boolean {
  return url !== undefined && CREDENTIAL_CHECKS.some((path) => url.includes(path));
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname === "/login" || pathname.startsWith("/login/")) return;
  const returnUrl = encodeURIComponent(`${pathname}${search}`);
  // Hard reload is deliberate: the in-memory token is already cleared,
  // so client-side routing would keep rendering authed UI against a
  // dead session. A full document load reboots to a clean state.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login?returnUrl=${returnUrl}`);
}

function redirectToForcedPasswordChange(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/reset-password")) return;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/reset-password?forced=1");
}

// Single-flight refresh: concurrent 401s share ONE refresh call, then
// all retry. Refresh failure (rotated-away, revoked, expired) clears
// the session and sends the user to login with a return URL.
let refreshPromise: Promise<string> | null = null;

/**
 * Exchange the HttpOnly refresh cookie for a new access token.
 * Also used by session bootstrap on reload and after a forced password
 * change (the old token still carries the stale `pwd` claim).
 * Rejects when there is no session id or the server refuses the cookie.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const sessionId = getSessionId();
      if (!sessionId) throw new Error("No session");
      const { data } = await refreshApi.post<{ accessToken: string }>("/api/v1/auth/refresh", {
        sessionId,
      });
      if (!data?.accessToken) throw new Error("Refresh response did not contain access token");
      setSession(data.accessToken, sessionId);
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;
    const problem = problemOf(error);

    // Forced password change is a 403 with a stable code — the session
    // is alive, it just may not use other resources yet.
    if (status === 403 && problem.code === PASSWORD_CHANGE_REQUIRED) {
      redirectToForcedPasswordChange();
      return Promise.reject(error);
    }

    if (status !== 401) return Promise.reject(error);

    // Credential checks: surface the error, keep the current session.
    if (isCredentialCheck(originalRequest.url)) return Promise.reject(error);

    if (originalRequest._retry) {
      // A freshly refreshed token was rejected too: the session is dead.
      clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    // No session id means there is nothing to refresh with.
    if (!getSessionId()) {
      clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      const token = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearSession();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);
