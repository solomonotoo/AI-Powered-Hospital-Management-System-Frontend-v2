"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldErrorsOf, useVerifyMfa } from "@/features/identity/hooks/use-auth";
import { mfaCodeSchema, type MfaCodeFormValues } from "@/features/identity/schemas/mfa";
import { getMfaToken } from "@/lib/auth-store";
import { problemOf } from "@/lib/http";

// Second step: 6-digit TOTP from the authenticator app, or a printed
// recovery code when the phone is gone (server tries both). No challenge
// token in memory (refresh/reload) → back to login for a fresh one.
function VerifyMfaForm() {
  const router = useRouter();
  const verify = useVerifyMfa();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MfaCodeFormValues>({ resolver: zodResolver(mfaCodeSchema) });

  if (getMfaToken() === null) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm text-muted-foreground">
            No active verification. Challenges expire after 5 minutes.
          </p>
          <Button onClick={() => router.replace("/login")}>Back to sign in</Button>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = (values: MfaCodeFormValues) => {
    verify.mutate(values.code.trim(), {
      onError: (error) => {
        const problem = problemOf(error);
        const mapped = fieldErrorsOf(error);
        for (const [field, message] of Object.entries(mapped)) {
          setError(field as keyof MfaCodeFormValues, { message });
        }
        toast.error(problem.message ?? "Verification failed", {
          description: problem.traceId ? `Ref: ${problem.traceId}` : undefined,
        });
      },
    });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Two-step verification</CardTitle>
        <CardDescription>
          Enter the 6-digit code — or a recovery code if your authenticator is unavailable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              inputMode="text"
              autoComplete="one-time-code"
              placeholder="123456 or XXXXXXXX"
              {...register("code")}
            />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting || verify.isPending}>
            {verify.isPending ? "Verifying…" : "Verify"}
          </Button>
          <Link
            href="/login"
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Use a different account
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

export default function MfaPage() {
  return (
    <Suspense>
      <VerifyMfaForm />
    </Suspense>
  );
}
