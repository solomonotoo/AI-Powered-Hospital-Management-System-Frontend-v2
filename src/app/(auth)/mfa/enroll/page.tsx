"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmMfa, enrollMfa } from "@/features/identity/api/mfa";
import { mfaCodeSchema, type MfaCodeFormValues } from "@/features/identity/schemas/mfa";
import { problemOf } from "@/lib/http";
import { useMutation } from "@tanstack/react-query";

// Enrolment: start (secret + URI shown ONCE) → user scans → confirm
// with a live code → recovery sheet shown ONCE with a printed checkbox.
// Navigating away mid-flow orphans the pending secret safely (login
// keeps working until some code confirms).
export default function MfaEnrollPage() {
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

  if (recoveryCodes) {
    return (
      <Card className="w-full max-w-sm">
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
          <Button disabled={!printed} onClick={() => router.replace("/dashboard")}>
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!enrolment) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set up two-step verification</CardTitle>
          <CardDescription>
            You will need an authenticator app. Privileged roles require this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => start.mutate()} disabled={start.isPending} className="w-full">
            {start.isPending ? "Preparing…" : "Show setup code"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Scan, then confirm</CardTitle>
        <CardDescription>
          Add this secret to your authenticator app, then enter the code it shows.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="break-all rounded bg-muted p-3 font-mono text-sm">{enrolment.secret}</p>
        <form
          onSubmit={handleSubmit((values) => confirm.mutate(values.code.trim()))}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">6-digit code</Label>
            <Input id="code" inputMode="numeric" autoComplete="one-time-code" {...register("code")} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting || confirm.isPending}>
            {confirm.isPending ? "Confirming…" : "Confirm"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
