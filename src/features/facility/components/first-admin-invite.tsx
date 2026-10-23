"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useInviteFirstFacilityAdmin } from "@/features/facility/hooks/use-facilities";
import {
  firstAdminSchema,
  type FirstAdminFormValues,
} from "@/features/identity/schemas/first-admin";
import { fieldErrorsOf, problemOf } from "@/lib/http";

// Day-0 bootstrap: exactly one FACILITY_ADMIN grant, created atomically
// with the INVITED staff account. The response token is the only copy
// the platform owner gets until the notification module exists, so it
// stays in React state (never storage, never logs) and is shown once.
export function FirstAdminInvite({
  facilityId,
  facilityName,
}: {
  facilityId: string;
  facilityName: string;
}) {
  const invite = useInviteFirstFacilityAdmin(facilityId);
  const [alreadyProvisioned, setAlreadyProvisioned] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FirstAdminFormValues>({
    resolver: zodResolver(firstAdminSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  const pending = isSubmitting || invite.isPending;
  const provisioned = invite.data;
  // Success only exists after a client-side mutation, so window is
  // available here; the server render never produces this branch.
  const invitationLink =
    provisioned && typeof window !== "undefined"
      ? `${window.location.origin}/accept-invite?token=${encodeURIComponent(provisioned.invitationToken)}&next=setup`
      : "";

  const submit = handleSubmit(async ({ email }) => {
    setAlreadyProvisioned(null);
    try {
      await invite.mutateAsync(email);
      toast.success("First administrator invited");
    } catch (error) {
      const problem = problemOf(error);

      if (problem.code === "FACILITY_ADMIN_ALREADY_PROVISIONED") {
        setAlreadyProvisioned(
          problem.message ??
            "This facility already has an administrator; further grants need approval.",
        );
        return;
      }

      const serverFields = fieldErrorsOf(error);
      if (serverFields.email) {
        setError("email", { type: "server", message: serverFields.email });
        return;
      }

      if (
        problem.code === "BAD_REQUEST" &&
        (problem.message ?? "").toLowerCase().includes("account already exists")
      ) {
        setError("email", {
          type: "server",
          message: "An account already exists for this email address.",
        });
        return;
      }

      toast.error(problem.message ?? "Could not invite the administrator");
    }
  });

  const copyLink = async () => {
    if (!invitationLink) return;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success("Invitation link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus aria-hidden="true" className="size-4" />
          First administrator
        </CardTitle>
        <CardDescription>
          One bootstrap invitation for {facilityName}. The account receives the
          Facility Administrator role immediately and sets its own password from the link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alreadyProvisioned && (
          <Alert>
            <AlertTitle>Administrator already provisioned</AlertTitle>
            <AlertDescription>{alreadyProvisioned}</AlertDescription>
          </Alert>
        )}

        {provisioned ? (
          <div className="space-y-4">
            <Alert className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30">
              <Check
                aria-hidden="true"
                className="text-emerald-600 dark:text-emerald-400"
              />
              <AlertTitle>Administrator invited</AlertTitle>
              <AlertDescription>
                Send this single-use link to the administrator over a trusted channel.
                They choose their own password on the accept screen.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="invitation-link">Invitation link</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="invitation-link"
                  readOnly
                  value={invitationLink}
                  onFocus={(event) => event.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <Button type="button" variant="outline" onClick={copyLink}>
                  {copied ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <Copy aria-hidden="true" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Shown once. This console does not store the token or write it to logs. If
                the link is lost, a second bootstrap invitation is refused by the backend;
                the account must be recovered through the identity admin flow.
              </p>
            </div>

            <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="font-medium">User id</dt>
                <dd className="font-mono break-all">{provisioned.userId}</dd>
              </div>
              <div>
                <dt className="font-medium">Assignment id</dt>
                <dd className="font-mono break-all">{provisioned.assignmentId}</dd>
              </div>
            </dl>
          </div>
        ) : alreadyProvisioned ? null : (
          <form noValidate onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Administrator email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                placeholder="administrator@hospital.example"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email?.message && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                The address becomes the account username. An account created elsewhere
                with this address is rejected rather than linked silently.
              </p>
            </div>

            <Button type="submit" disabled={pending}>
              {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {pending ? "Inviting…" : "Invite first administrator"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
