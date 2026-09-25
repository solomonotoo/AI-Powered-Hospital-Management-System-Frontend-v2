import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearSession, getAccessToken, getSessionId, setSession } from "./auth-store";
import { env } from "./env";

// Single axios instance for the whole app.
//
// Auth model (matches the backend):
// - Access token: Authorization header, from memory (auth-store).
// - Refresh: HttpOnly cookie (withCredentials) + sessionId from memory.
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

export const api = axios.create({
  baseURL: env.API_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  // Send the HttpOnly refresh cookie on same-origin auth calls.
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

// Single-flight refresh: concurrent 401s share ONE refresh call, then
// all retry. Refresh failure (rotated-away, revoked, expired) clears
// the session and sends the user to login with a return URL.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
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
    if (!originalRequest || originalRequest._retry) {
      if (error.response?.status === 401) clearSession();
      return Promise.reject(error);
    }
    if (error.response?.status !== 401) return Promise.reject(error);
    // Never refresh the refresh/login calls themselves.
    if (originalRequest.url?.includes("/api/v1/auth/")) {
      clearSession();
      return Promise.reject(error);
    }
    originalRequest._retry = true;
    try {
      const token = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearSession();
      const returnUrl =
        typeof window !== "undefined" ? window.location.pathname : "/login";
      if (typeof window !== "undefined" && !returnUrl.startsWith("/login")) {
        // Hard reload is deliberate here: the in-memory token is already
        // cleared, so client-side routing would keep rendering authed UI
        // against a dead session. Full reload reboots to a clean state.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
      }
      return Promise.reject(refreshError);
    }
  },
);
