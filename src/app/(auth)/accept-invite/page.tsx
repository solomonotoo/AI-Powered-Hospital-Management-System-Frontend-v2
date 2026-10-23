"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite } from "@/features/identity/api/invite";
import {
  acceptInviteSchema,
  type AcceptInviteFormValues,
} from "@/features/identity/schemas/mfa";
import { fieldErrorsOf } from "@/features/identity/hooks/use-auth";
import { problemOf } from "@/lib/http";
import { useMutation } from "@tanstack/react-query";

// Invitation claim: token rides ?token= (single-use, short-lived —
// standard practice, safe in browser history for one-time links).
// Missing/expired tokens show the same screen either way (no oracle).
function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  // First-admin invitations carry `next=setup`; after signing in the
  // new administrator lands on the setup checklist instead of the
  // generic dashboard. The value is a fixed screen name, not a URL.
  const next = params.get("next");
  const returnUrl = next === "setup" ? "/admin/setup" : null;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteFormValues>({ resolver: zodResolver(acceptInviteSchema) });

  const claim = useMutation({
    mutationFn: (values: AcceptInviteFormValues) => acceptInvite(token, values.password),
    onSuccess: () => {
      toast.success(
        returnUrl
          ? "Account activated — sign in to finish facility setup"
          : "Account activated — sign in with your new password",
      );
      router.replace(
        returnUrl
          ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
          : "/login",
      );
    },
    onError: (error) => {
      const problem = problemOf(error);
      const mapped = fieldErrorsOf(error);
      for (const [field, message] of Object.entries(mapped)) {
        setError(field as keyof AcceptInviteFormValues, { message });
      }
      toast.error(problem.message ?? "Invitation invalid or expired");
    },
  });

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            This invitation link is incomplete. Ask your administrator to resend it.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Activate your account</CardTitle>
        <CardDescription>Set a password only you know (min 10 characters).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((values) => claim.mutate(values))} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Repeat password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting || claim.isPending}>
            {claim.isPending ? "Activating…" : "Activate account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
