"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  login,
  logout,
  selectFacility,
  type LoginResponse,
} from "@/features/identity/api/auth";
import { verifyMfa } from "@/features/identity/api/mfa";
import { sessionQueryKey } from "@/features/identity/hooks/use-session";
import { problemOf } from "@/lib/http";
import { getMfaToken, setMfaToken } from "@/lib/auth-store";

/** Only same-app absolute paths are accepted as a post-login destination. */
function safeReturnUrl(returnUrl: string | null): string | null {
  if (!returnUrl || !returnUrl.startsWith("/") || returnUrl.startsWith("//")) return null;
  return returnUrl;
}

// Post-authentication routing from the RESPONSE shape — never client
// role checks. Shared by login, MFA verify and facility select so all
// three land identically: challenge → forced reset → tier → returnUrl.
export function routeForSession(
  router: { replace: (url: string) => void },
  returnUrl: string | null,
  data: LoginResponse,
) {
  if (data.mfaRequired) {
    setMfaToken(data.mfaToken ?? null);
    router.replace("/mfa");
    return;
  }
  if (data.mustChangePassword) {
    router.replace("/reset-password?forced=1");
    return;
  }
  // Platform accounts have no facility context and must never land in
  // the facility workspace (the backend enforces this too).
  if (data.accountType === "PLATFORM") {
    router.replace("/platform");
    return;
  }
  // Staff without an active facility: picker shows the assignment (or
  // the "contact your administrator" state when there is none).
  if (data.facilityId === null) {
    router.replace("/select-facility");
    return;
  }
  router.replace(safeReturnUrl(returnUrl) ?? "/dashboard");
}

export function useLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      login(username, password),
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: sessionQueryKey });
      routeForSession(router, params.get("returnUrl"), data);
    },
  });
}

export function useVerifyMfa() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => {
      const token = getMfaToken();
      if (!token) throw new Error("Challenge expired — sign in again");
      return verifyMfa(token, code);
    },
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: sessionQueryKey });
      routeForSession(router, params.get("returnUrl"), data);
    },
  });
}

export function useSelectFacility() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (facilityId: string) => selectFacility(facilityId),
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: sessionQueryKey });
      routeForSession(router, params.get("returnUrl"), data);
    },
  });
}

/**
 * Facility switching from inside the authenticated shell. The access
 * token (and therefore every facility-scoped cache entry) changes, so
 * the cache is dropped and the shell reloads through the normal
 * bootstrap path instead of silently serving facility A's data.
 */
export function useSwitchFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (facilityId: string) => selectFacility(facilityId),
    onSuccess: () => {
      queryClient.clear();
      // A full reload guarantees no facility-A cache entry survives the
      // token switch (and re-runs session bootstrap cleanly).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/dashboard");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    // onSettled, not onSuccess: the workstation must sign out even when
    // the server call fails (the local session is already cleared).
    onSettled: () => {
      queryClient.clear();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    },
  });
}

// Server field errors (problem+json fieldErrors[]) map onto RHF fields
// by name; unknown fields collapse into the form error toast.
export function fieldErrorsOf(error: unknown): Record<string, string> {
  const problem = problemOf(error);
  const mapped: Record<string, string> = {};
  for (const fieldError of problem.fieldErrors ?? []) {
    if (fieldError.field) mapped[fieldError.field] = fieldError.message ?? "Invalid value";
  }
  return mapped;
}
