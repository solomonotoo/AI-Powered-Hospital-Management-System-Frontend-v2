"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/http";
import { getAccessToken, subscribeAuth, type Session } from "@/lib/auth-store";

// Session bootstrap: GET /identity/me → cached user + facility +
// effective permissions + assigned facilities. Every permission-gated
// UI reads from here; the BACKEND re-checks every request (UI gating
// is convenience, never security).

export const sessionQueryKey = ["session"] as const;

async function fetchSession(): Promise<Session> {
  const { data } = await api.get<Session>("/api/v1/identity/me");
  return data;
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
