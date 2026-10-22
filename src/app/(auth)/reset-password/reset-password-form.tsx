"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/features/identity/api/password";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/features/identity/schemas/password";
import { fieldErrorsOf } from "@/features/identity/hooks/use-auth";
import {
  bootstrapSession,
  sessionQueryKey,
} from "@/features/identity/hooks/use-session";
import { clearSession, getAccessToken } from "@/lib/auth-store";
import { problemOf, refreshAccessToken } from "@/lib/http";

// Forced + voluntary password change share one form. Forced mode
// (?forced=1, first login / expired invite) explains WHY before asking:
// users who understand the reason don't fight the screen.
//
// After the change the current access token still carries the old
// `pwd` claim (the backend cannot mutate an issued JWT), so the token
// is rotated through /auth/refresh before routing onward. Without this
// every subsequent request would be rejected with 403
// PASSWORD_CHANGE_REQUIRED until the short-lived token expired.
export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const forced = params.get("forced") === "1";
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    // This page is public (the emailed reset link also uses it). A
    // forced change after a reload has no access token yet, so restore
    // one from the refresh cookie before calling an authenticated API.
    if (!getAccessToken()) {
      await bootstrapSession();
      if (!getAccessToken()) {
        toast.error("Session expired — sign in again to change your password");
        router.replace("/login");
        return;
      }
    }

    try {
      await changePassword(values.currentPassword, values.newPassword);
    } catch (error) {
      const problem = problemOf(error);
      const mapped = fieldErrorsOf(error);
      for (const [field, message] of Object.entries(mapped)) {
        setError(field as keyof ChangePasswordFormValues, { message });
      }
      toast.error(problem.message ?? "Password change failed", {
        description: problem.traceId ? `Ref: ${problem.traceId}` : undefined,
      });
      return;
    }

    try {
      await refreshAccessToken();
    } catch {
      // Password did change; only the session could not be rotated
      // (cookie expired/revoked in the meantime). Sign in again.
      clearSession();
      toast.success("Password changed — please sign in again");
      router.replace("/login");
      return;
    }

    queryClient.removeQueries({ queryKey: sessionQueryKey });
    toast.success("Password changed");
    router.replace("/dashboard");
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{forced ? "Set a new password" : "Change password"}</CardTitle>
        <CardDescription>
          {forced
            ? "First login requires a password only you know."
            : "Your other sessions will be signed out."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">New password (min 10 characters)</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Repeat new password</Label>
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save new password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
