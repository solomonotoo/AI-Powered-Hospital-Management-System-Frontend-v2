"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { confirmMfa, enrollMfa } from "@/features/identity/api/mfa";
import { mfaCodeSchema, type MfaCodeFormValues } from "@/features/identity/schemas/mfa";
import { problemOf } from "@/lib/http";

// Enrolment: start (secret + URI shown ONCE) → user scans → confirm
// with a live code → recovery sheet shown ONCE with a printed checkbox.
// Navigating away mid-flow orphans the pending secret safely (login
// keeps working until some code confirms).
//
// WHY this route is authenticated and not under (auth): enrol/confirm
// require an access token. The auth layout is explicitly logged-out.
export default function SecurityPage() {
  const router = useRouter();
  const [enrolment, setEnrolment] = useState<{ secret: string; provisioningUri: string } | null>(
    null,
  );
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [printed, setPrinted] = useState(false);

  const start = useMutation({
    mutationFn: enrollMfa,
    onSuccess: setEnrolment,
    onError: (error) => toast.error(problemOf(error).message ?? "Could not start enrolment"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MfaCodeFormValues>({ resolver: zodResolver(mfaCodeSchema) });

  const confirm = useMutation({
    mutationFn: (code: string) => confirmMfa(code),
    onSuccess: (data) => setRecoveryCodes(data.recoveryCodes),
    onError: (error) => toast.error(problemOf(error).message ?? "Code not accepted"),
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Account security"
        description="Protect your account with two-step verification and a password only you know."
      />

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Changing your password signs out your other sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/reset-password">Change password</Link>
            </Button>
          </CardContent>
        </Card>

        {recoveryCodes ? (
          <Card>
            <CardHeader>
              <CardTitle>Save these recovery codes</CardTitle>
              <CardDescription>
                Shown once. Each works a single time if your authenticator is lost.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ol className="grid grid-cols-2 gap-1 rounded bg-muted p-3 font-mono text-sm">
                {recoveryCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ol>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={printed}
                  onChange={(event) => setPrinted(event.target.checked)}
                />
                I have printed or saved these codes
              </label>
              <Button
                disabled={!printed}
                onClick={() => {
                  setRecoveryCodes(null);
                  setEnrolment(null);
                  router.replace("/account/security");
                }}
              >
                Done
              </Button>
            </CardContent>
          </Card>
        ) : !enrolment ? (
          <Card>
            <CardHeader>
              <CardTitle>Two-step verification</CardTitle>
              <CardDescription>
                You will need an authenticator app. Privileged roles require this.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => start.mutate()} disabled={start.isPending}>
                {start.isPending ? "Preparing…" : "Show setup code"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Scan, then confirm</CardTitle>
              <CardDescription>
                Add this secret to your authenticator app, then enter the code it shows.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="break-all rounded bg-muted p-3 font-mono text-sm">
                {enrolment.secret}
              </p>
              <form
                onSubmit={handleSubmit((values) => confirm.mutate(values.code.trim()))}
                className="flex flex-col gap-4"
                noValidate
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="code">6-digit code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    {...register("code")}
                  />
                  {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
                </div>
                <Button type="submit" disabled={isSubmitting || confirm.isPending}>
                  {confirm.isPending ? "Confirming…" : "Confirm"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
