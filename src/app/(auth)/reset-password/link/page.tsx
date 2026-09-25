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
import { fieldErrorsOf } from "@/features/identity/hooks/use-auth";
import { resetPassword } from "@/features/identity/api/invite";
import {
  resetViaLinkSchema,
  type ResetViaLinkFormValues,
} from "@/features/identity/schemas/mfa";
import { problemOf } from "@/lib/http";
import { useMutation } from "@tanstack/react-query";

// Emailed-link reset: token rides ?token= (single-use, 1 hour). Same
// generic failure as invite claims — expired, spent and forged links
// are indistinguishable by design.
function ResetViaLinkForm({ token }: { token: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetViaLinkFormValues>({ resolver: zodResolver(resetViaLinkSchema) });

  const reset = useMutation({
    mutationFn: (values: ResetViaLinkFormValues) => resetPassword(token, values.password),
    onSuccess: () => {
      toast.success("Password reset — sign in with the new password");
      router.replace("/login");
    },
    onError: (error) => {
      const problem = problemOf(error);
      const mapped = fieldErrorsOf(error);
      for (const [field, message] of Object.entries(mapped)) {
        setError(field as keyof ResetViaLinkFormValues, { message });
      }
      toast.error(problem.message ?? "Reset link invalid or expired");
    },
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Min 10 characters, different from recent passwords.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((values) => reset.mutate(values))} className="flex flex-col gap-4" noValidate>
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
          <Button type="submit" disabled={isSubmitting || reset.isPending}>
            {reset.isPending ? "Saving…" : "Save new password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ResetPasswordRouter() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            This reset link is incomplete. Request a new one from the login page.
          </p>
        </CardContent>
      </Card>
    );
  }
  return <ResetViaLinkForm token={token} />;
}

export default function ResetPasswordLinkPage() {
  return (
    <Suspense>
      <ResetPasswordRouter />
    </Suspense>
  );
}
