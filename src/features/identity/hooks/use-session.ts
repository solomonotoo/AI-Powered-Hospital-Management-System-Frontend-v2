"use client";

import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { api, refreshAccessToken } from "@/lib/http";
import {
  clearSession,
  getAccessToken,
  getSessionId,
  subscribeAuth,
  type Session,
} from "@/lib/auth-store";

// Session bootstrap: GET /identity/me → cached user + facility +
// effective permissions + assigned facilities. Every permission-gated
// UI reads from here; the BACKEND re-checks every request (UI gating
// is convenience, never security).

export const sessionQueryKey = ["session"] as const;

async function fetchSession(): Promise<Session> {
  const { data } = await api.get<Session>("/api/v1/identity/me");
  return data;
}

let bootstrapPromise: Promise<void> | null = null;

/**
 * Resume a session after a reload.
 *
 * The access token is memory-only, so a fresh document has none. The
 * HttpOnly refresh cookie plus the persisted (non-secret) session id
 * are enough to mint a new one. Failures clear the client state so the
 * UI cannot keep rendering against a dead session.
 *
 * Skipped when an access token already exists (e.g. right after login).
 * Single-flight so React strict mode and multiple gates cannot rotate
 * the refresh cookie twice.
 */
export function bootstrapSession(): Promise<void> {
  if (getAccessToken() || !getSessionId()) return Promise.resolve();
  if (!bootstrapPromise) {
    bootstrapPromise = refreshAccessToken()
      .then(() => undefined)
      .catch((error: unknown) => {
        // The server answered, so the session is definitively refused
        // (the backend maps auth failures to a 4xx problem body).
        // A network blip has no response and must not destroy the
        // stored identifier — the next reload can try again; without
        // a token the gate still routes to login.
        const answered = axios.isAxiosError(error) && error.response !== undefined;
        if (answered) clearSession();
      })
      .finally(() => {
        bootstrapPromise = null;
      });
  }
  return bootstrapPromise;
}

/** Runs bootstrap once per mount and reports when it has settled. */
export function useSessionBootstrap(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    bootstrapSession().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return ready;
}

export function useSession() {
  const token = useSyncExternalStore(
    subscribeAuth,
    () => getAccessToken(),
    () => null,
  );
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSession,
    enabled: token !== null,
    staleTime: 60_000,
    retry: false,
  });

  // Token cleared (logout/refresh failure) → drop the cached session
  // immediately so no stale permissions linger on screen.
  useEffect(() => {
    if (token === null) queryClient.removeQueries({ queryKey: sessionQueryKey });
  }, [token, queryClient]);

  return query;
}

// Permission check hook: useCan("PATIENT_REGISTER"). Reads the session
// permissions; returns false while loading (fail-closed UI).
export function useCan(permission: string): boolean {
  const { data } = useSession();
  return data?.permissions.includes(permission) ?? false;
}

/**
 * Navigation gating: true when the session holds ANY of the listed
 * permissions. An empty list means "no permission required".
 */
export function useHasAny(permissions: string[] = []): boolean {
  const { data } = useSession();
  if (permissions.length === 0) return true;
  if (!data) return false;
  return permissions.some((permission) => data.permissions.includes(permission));
}
