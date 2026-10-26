"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
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
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { useInviteUser } from "../hooks/use-users";
import {
  inviteUserSchema,
  type InviteUserFormValues,
} from "../schemas/admin";
import { TokenReveal } from "./token-reveal";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function InviteUserForm() {
  const invite = useInviteUser();
  const [token, setToken] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  const submit = handleSubmit(async (values) => {
    try {
      const result = await invite.mutateAsync(values);
      setToken(result.invitationToken);
      reset({ email: "" });
      toast.success("Invitation created");
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;
      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (field === "email") {
          setError("email", { type: "server", message });
          firstInvalid = true;
        }
      }
      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not create the invitation");
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus aria-hidden="true" className="size-4" />
          Invite a user
        </CardTitle>
        <CardDescription>
          The account starts in INVITED state. The person accepts the
          invitation, sets a password and enrols MFA before normal access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {token && (
          <TokenReveal
            token={token}
            title="Invitation created"
            description="Send this single-use token to the invitee through an approved channel. It will not be shown again."
          />
        )}

        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <UserPlus aria-hidden="true" />
              )}
              Create invitation
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/users">Back to users</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
