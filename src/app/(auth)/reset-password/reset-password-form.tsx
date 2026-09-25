"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { problemOf } from "@/lib/http";

// Forced + voluntary password change share one form. Forced mode
// (?forced=1, first login / expired invite) explains WHY before asking:
// users who understand the reason don't fight the screen.
export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const forced = params.get("forced") === "1";
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast.success("Password changed — signing you in");
      router.replace("/dashboard");
    } catch (error) {
      const problem = problemOf(error);
      const mapped = fieldErrorsOf(error);
      for (const [field, message] of Object.entries(mapped)) {
        setError(field as keyof ChangePasswordFormValues, { message });
      }
      toast.error(problem.message ?? "Password change failed", {
        description: problem.traceId ? `Ref: ${problem.traceId}` : undefined,
      });
    }
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
