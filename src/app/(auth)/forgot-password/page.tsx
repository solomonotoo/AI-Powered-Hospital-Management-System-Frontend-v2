"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/features/identity/api/invite";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/features/identity/schemas/mfa";
import { problemOf } from "@/lib/http";
import { useMutation } from "@tanstack/react-query";

// Self-service reset request: the confirmation is IDENTICAL whether
// the account exists (anti-enumeration, server-enforced). No hints leak.
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const request = useMutation({
    mutationFn: (values: ForgotPasswordFormValues) => forgotPassword(values.username),
    onSuccess: () => setSent(true),
    onError: (error) => toast.error(problemOf(error).message ?? "Request failed"),
  });

  if (sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account matches, a reset link is on its way. It expires in one hour.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>Enter your username or email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((values) => request.mutate(values))}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username or email</Label>
            <Input id="username" autoComplete="username" {...register("username")} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting || request.isPending}>
            {request.isPending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
