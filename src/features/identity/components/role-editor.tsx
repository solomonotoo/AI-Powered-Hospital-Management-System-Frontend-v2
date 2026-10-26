"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/features/identity/hooks/use-session";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import {
  useCloneRole,
  useDeleteRole,
  usePermissions,
  useUpdateRole,
} from "../hooks/use-roles";
import {
  cloneRoleSchema,
  roleEditSchema,
  toCloneRoleInput,
  toUpdateRoleInput,
  type CloneRoleFormValues,
  type RoleEditFormValues,
} from "../schemas/admin";
import { ROLE_TIER_LABELS, type RoleView } from "../types/admin";
import { PermissionGrid } from "./permission-grid";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function CloneRoleDialog({
  role,
  open,
  onOpenChange,
}: {
  role: RoleView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const clone = useCloneRole(role.code);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CloneRoleFormValues>({
    resolver: zodResolver(cloneRoleSchema),
    defaultValues: { code: "", name: `${role.name} copy` },
    mode: "onTouched",
  });

  const submit = handleSubmit(async (values) => {
    try {
      await clone.mutateAsync(toCloneRoleInput(values));
      toast.success("Role cloned");
      onOpenChange(false);
      reset({ code: "", name: `${role.name} copy` });
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
        toast.error(problem.message ?? "Could not clone the role");
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clone role</DialogTitle>
          <DialogDescription>
            Clone {role.name} into a new custom role with the same permissions.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clone-role-code">New code</Label>
            <Input
              id="clone-role-code"
              placeholder="CASHIER_NIGHT"
              className="font-mono"
              aria-invalid={Boolean(errors.code)}
              {...register("code")}
            />
            <FieldError message={errors.code?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clone-role-name">New name</Label>
            <Input
              id="clone-role-name"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={clone.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={clone.isPending}>
              {clone.isPending && (
                <Loader2 aria-hidden="true" className="animate-spin" />
              )}
              Clone role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRoleDialog({
  role,
  open,
  onOpenChange,
}: {
  role: RoleView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const remove = useDeleteRole();

  const submit = async () => {
    try {
      await remove.mutateAsync(role.code);
      toast.success("Role deleted");
      onOpenChange(false);
      router.push("/admin/roles");
    } catch (error) {
      toast.error(problemOf(error).message ?? "Could not delete the role");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete role</DialogTitle>
          <DialogDescription>
            Delete {role.name}? The backend refuses if the role is still
            assigned. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={remove.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={remove.isPending}
          >
            {remove.isPending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
            Delete role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RoleEditor({ role }: { role: RoleView }) {
  const canManage = useCan("IDENTITY_ROLE_MANAGE");
  const editable = canManage && !role.systemTemplate;
  const permissions = usePermissions();
  const update = useUpdateRole(role.code);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RoleEditFormValues>({
    resolver: zodResolver(roleEditSchema),
    defaultValues: {
      name: role.name,
      permissions: role.permissions,
    },
    mode: "onTouched",
  });

  const submit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync(toUpdateRoleInput(values));
      toast.success("Role updated");
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;
      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (field === "name") {
          setError("name", { type: "server", message });
          firstInvalid = true;
        }
      }
      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not update the role");
      }
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{role.name}</CardTitle>
            <Badge variant="outline">{ROLE_TIER_LABELS[role.tier]}</Badge>
            {role.systemTemplate ? (
              <Badge variant="secondary">System template</Badge>
            ) : (
              <Badge variant="outline">Custom</Badge>
            )}
          </div>
          <CardDescription className="font-mono text-xs">
            {role.code}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!editable && (
            <Alert className="mb-4">
              <ShieldAlert aria-hidden="true" />
              <AlertTitle>
                {role.systemTemplate
                  ? "Template roles are read-only"
                  : "Role management permission required"}
              </AlertTitle>
              <AlertDescription>
                {role.systemTemplate
                  ? "Clone this role to create a facility-specific version you can edit."
                  : "You can review the permission set, but changing roles requires IDENTITY_ROLE_MANAGE."}
              </AlertDescription>
            </Alert>
          )}

          <form noValidate onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="role-edit-name">Role name</Label>
              <Input
                id="role-edit-name"
                disabled={!editable}
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              {permissions.isPending ? (
                <Skeleton className="h-48 w-full" />
              ) : permissions.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>
                    Could not load the permission catalogue
                  </AlertTitle>
                  <AlertDescription>
                    {problemOf(permissions.error).message ??
                      "The permission set cannot be edited safely."}
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
                      disabled={!editable}
                    />
                  )}
                />
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {canManage && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCloneOpen(true)}
                >
                  Clone role
                </Button>
              )}
              {canManage && !role.systemTemplate && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </Button>
              )}
              {editable && (
                <Button
                  type="submit"
                  disabled={update.isPending || permissions.isPending}
                >
                  {update.isPending ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Save aria-hidden="true" />
                  )}
                  Save role
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <CloneRoleDialog
        role={role}
        open={cloneOpen}
        onOpenChange={setCloneOpen}
      />
      <DeleteRoleDialog
        role={role}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
