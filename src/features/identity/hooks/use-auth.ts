"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { login, selectFacility, type LoginResponse } from "@/features/identity/api/auth";
import { verifyMfa } from "@/features/identity/api/mfa";
import { sessionQueryKey } from "@/features/identity/hooks/use-session";
import { problemOf } from "@/lib/http";
import { getMfaToken, setMfaToken } from "@/lib/auth-store";

// Post-authentication routing from the RESPONSE shape — never client
// role checks. Shared by login, MFA verify and facility select so all
// three land identically: challenge → forced reset → picker → returnUrl.
export function routeForSession(
  router: { replace: (url: string) => void },
  returnUrl: string | null,
  data: LoginResponse,
) {
  if (data.mfaRequired) {
    setMfaToken(data.mfaToken);
    router.replace("/mfa");
    return;
  }
  if (data.mustChangePassword) {
    router.replace("/reset-password?forced=1");
    return;
  }
  if (data.facilityId === null && data.facilities.length > 1) {
    router.replace("/select-facility");
    return;
  }
  router.replace(returnUrl && returnUrl.startsWith("/") ? returnUrl : "/dashboard");
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
