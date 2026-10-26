"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
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
import { Skeleton } from "@/components/ui/skeleton";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { useCreateRole, usePermissions } from "../hooks/use-roles";
import {
  roleCreateSchema,
  toCreateRoleInput,
  type RoleCreateFormValues,
} from "../schemas/admin";
import { PermissionGrid } from "./permission-grid";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function RoleCreateForm() {
  const router = useRouter();
  const permissions = usePermissions();
  const create = useCreateRole();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RoleCreateFormValues>({
    resolver: zodResolver(roleCreateSchema),
    defaultValues: { code: "", name: "", permissions: [] },
    mode: "onTouched",
  });

  const submit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(toCreateRoleInput(values));
      toast.success("Role created");
      router.push(`/admin/roles/${values.code}`);
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;
      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (field === "code" || field === "name") {
          setError(field, { type: "server", message });
          firstInvalid = true;
        }
      }
      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not create the role");
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldPlus aria-hidden="true" className="size-4" />
          New custom role
        </CardTitle>
        <CardDescription>
          Custom roles live in this facility. Permission changes take effect
          on the next session check; the backend is authoritative.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-code">Role code</Label>
              <Input
                id="role-code"
                placeholder="CASHIER_NIGHT"
                className="font-mono"
                aria-invalid={Boolean(errors.code)}
                {...register("code")}
              />
              <FieldError message={errors.code?.message} />
              <p className="text-xs text-muted-foreground">
                Upper-case letters, numbers and underscores. The code cannot
                be changed later.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Role name</Label>
              <Input
                id="role-name"
                placeholder="Night cashier"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            {permissions.isPending ? (
              <Skeleton className="h-48 w-full" />
            ) : permissions.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Could not load the permission catalogue</AlertTitle>
                <AlertDescription>
                  {problemOf(permissions.error).message ??
                    "The role cannot be created with an unknown permission set."}
                </AlertDescription>
              </Alert>
            ) : (
              <Controller
                control={control}
                name="permissions"
                render={({ field }) => (
                  <PermissionGrid
                    permissions={permissions.data ?? []}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/roles")}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || permissions.isPending}
            >
              {create.isPending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <ShieldPlus aria-hidden="true" />
              )}
              Create role
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
