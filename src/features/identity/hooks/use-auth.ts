"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/features/identity/api/auth";
import { sessionQueryKey } from "@/features/identity/hooks/use-session";
import { problemOf } from "@/lib/http";
import { setMfaToken } from "@/lib/auth-store";

// Login orchestration: one mutation, four destinations. The RESPONSE
// shape decides the route — never client-side role checks:
// - mfaRequired → /mfa (challenge token held in memory by the page)
// - mustChangePassword → /reset-password (forced)
// - facilities.length > 1 → /select-facility
// - else → returnUrl (validated same-origin) or role landing (Slice 2)
export function useLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      login(username, password),
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: sessionQueryKey });
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
      const returnUrl = params.get("returnUrl");
      router.replace(returnUrl && returnUrl.startsWith("/") ? returnUrl : "/dashboard");
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
