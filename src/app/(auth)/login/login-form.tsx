"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldErrorsOf, useLogin } from "@/features/identity/hooks/use-auth";
import { loginSchema, type LoginFormValues } from "@/features/identity/schemas/auth";
import { problemOf } from "@/lib/http";

// Login: the ONLY self-service credential entry (no signup — accounts
// arrive via invitation). Server failures surface the stable message
// plus traceId for support; field errors map onto inputs.
export function LoginForm() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onError: (error) => {
        const problem = problemOf(error);
        const mapped = fieldErrorsOf(error);
        for (const [field, message] of Object.entries(mapped)) {
          setError(field as keyof LoginFormValues, { message });
        }
        toast.error(problem.message ?? "Login failed", {
          description: problem.traceId ? `Ref: ${problem.traceId}` : undefined,
        });
      },
    });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your hospital account credentials.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username or email</Label>
            <Input
              id="username"
              autoComplete="username"
              aria-invalid={!!errors.username}
              {...register("username")}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting || login.isPending}>
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
          <Link
            href="/forgot-password"
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
