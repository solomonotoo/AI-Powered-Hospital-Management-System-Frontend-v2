"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  Loader2,
  Lock,
  LockOpen,
  ShieldCheck,
  ShieldOff,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { AuditEventTable } from "@/features/audit/components/audit-event-table";
import { useUserActivity } from "@/features/audit/hooks/use-audit";
import { useCurrentFacilityUnits } from "@/features/facility/hooks/use-facilities";
import { useCan, useSession } from "@/features/identity/hooks/use-session";
import { formatDateTime } from "@/lib/format";
import { fieldErrorsOf, problemOf } from "@/lib/http";
import { ADMIN_PAGE_SIZE } from "@/lib/paged";
import { useAssignRole, useRoles } from "../hooks/use-roles";
import {
  useDisableUser,
  useEnableUser,
  useResetUserMfa,
  useResetUserPassword,
  useUnlockUser,
} from "../hooks/use-users";
import {
  assignRoleSchema,
  toAssignRoleInput,
  type AssignRoleFormValues,
} from "../schemas/admin";
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_TYPE_LABELS,
  type AccountStatus,
  type UserView,
} from "../types/admin";
import { TokenReveal } from "./token-reveal";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function statusVariant(status: AccountStatus) {
  if (status === "ACTIVE") return "secondary" as const;
  if (status === "DISABLED") return "destructive" as const;
  return "outline" as const;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function UserSummary({ user }: { user: UserView }) {
  const canReadStaff = useCan("STAFF_READ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account facts</CardTitle>
        <CardDescription>
          Identity and access metadata. Secrets are never exposed by the
          admin API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="User id">
            <span className="font-mono text-xs break-all">{user.id}</span>
          </Detail>
          <Detail label="Username">{user.username}</Detail>
          <Detail label="Account type">
            {ACCOUNT_TYPE_LABELS[user.accountType] ?? user.accountType}
          </Detail>
          <Detail label="Status">
            <Badge variant={statusVariant(user.status)}>
              {ACCOUNT_STATUS_LABELS[user.status] ?? user.status}
            </Badge>
          </Detail>
          <Detail label="MFA">
            <Badge variant={user.mfaEnabled ? "secondary" : "outline"}>
              {user.mfaEnabled ? "Enrolled" : "Not enrolled"}
            </Badge>
          </Detail>
          <Detail label="Password change">
            <Badge variant={user.mustChangePassword ? "destructive" : "secondary"}>
              {user.mustChangePassword ? "Required" : "Not required"}
            </Badge>
          </Detail>
          <Detail label="Staff record">
            {user.staffId ? (
              canReadStaff ? (
                <Link
                  href={`/admin/staff/${user.staffId}`}
                  className="font-mono text-xs break-all underline"
                >
                  {user.staffId}
                </Link>
              ) : (
                <span className="font-mono text-xs break-all">
                  {user.staffId}
                </span>
              )
            ) : (
              "Not linked"
            )}
          </Detail>
          <Detail label="Last login">
            {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
          </Detail>
        </dl>
      </CardContent>
    </Card>
  );
}

function UserActions({ user }: { user: UserView }) {
  const session = useSession().data;
  const canReset = useCan("IDENTITY_USER_RESET_PASSWORD");
  const canDisable = useCan("IDENTITY_USER_DISABLE");
  const canUnlock = useCan("IDENTITY_USER_UNLOCK");
  const resetPassword = useResetUserPassword();
  const disable = useDisableUser();
  const enable = useEnableUser();
  const unlock = useUnlockUser();
  const resetMfa = useResetUserMfa();
  const [token, setToken] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"disable" | "mfa" | null>(null);

  const self = session?.userId === user.id;
  const pending =
    resetPassword.isPending ||
    disable.isPending ||
    enable.isPending ||
    unlock.isPending ||
    resetMfa.isPending;

  const issueReset = async () => {
    try {
      const result = await resetPassword.mutateAsync(user.id);
      setToken(result.invitationToken);
      toast.success("Password reset token issued");
    } catch (error) {
      toast.error(problemOf(error).message ?? "Could not issue a reset token");
    }
  };

  const runConfirmed = async () => {
    try {
      if (confirm === "disable") {
        await disable.mutateAsync(user.id);
        toast.success("Account disabled");
      } else if (confirm === "mfa") {
        await resetMfa.mutateAsync(user.id);
        toast.success("MFA reset; the account must re-enrol");
      }
      setConfirm(null);
    } catch (error) {
      toast.error(problemOf(error).message ?? "Could not complete the action");
    }
  };

  const runSimple = async (action: "enable" | "unlock") => {
    try {
      if (action === "enable") {
        await enable.mutateAsync(user.id);
        toast.success("Account enabled");
      } else {
        await unlock.mutateAsync(user.id);
        toast.success("Account unlocked");
      }
    } catch (error) {
      toast.error(problemOf(error).message ?? "Could not complete the action");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account actions</CardTitle>
        <CardDescription>
          Administrative controls are audited. Disabling an account revokes
          its active sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {token && (
          <TokenReveal
            token={token}
            title="Password reset token"
            description="Send this single-use token to the account holder through an approved channel. It will not be shown again."
          />
        )}

        {self && (
          <Alert>
            <AlertTitle>This is your own account</AlertTitle>
            <AlertDescription>
              Self-disable is not offered here. Use another administrator for
              actions that would lock you out.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          {canReset && (
            <Button
              type="button"
              variant="outline"
              onClick={issueReset}
              disabled={pending}
            >
              <KeyRound aria-hidden="true" />
              Reset password
            </Button>
          )}
          {canReset && user.mfaEnabled && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirm("mfa")}
              disabled={pending}
            >
              <ShieldOff aria-hidden="true" />
              Reset MFA
            </Button>
          )}
          {canDisable && user.status !== "DISABLED" && !self && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirm("disable")}
              disabled={pending}
            >
              <Lock aria-hidden="true" />
              Disable account
            </Button>
          )}
          {canDisable && user.status === "DISABLED" && (
            <Button
              type="button"
              onClick={() => runSimple("enable")}
              disabled={pending}
            >
              <LockOpen aria-hidden="true" />
              Enable account
            </Button>
          )}
          {canUnlock && user.status === "LOCKED" && (
            <Button
              type="button"
              onClick={() => runSimple("unlock")}
              disabled={pending}
            >
              <LockOpen aria-hidden="true" />
              Unlock account
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirm === "disable" ? "Disable account" : "Reset MFA"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "disable"
                ? "The account will be disabled and its active sessions revoked. Access can be restored by enabling it again."
                : "The current MFA enrolment will be invalidated. The account holder must enrol again before privileged access."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirm(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirm === "disable" ? "destructive" : "default"}
              onClick={runConfirmed}
              disabled={pending}
            >
              {pending && (
                <Loader2 aria-hidden="true" className="animate-spin" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AssignRoleCard({ user }: { user: UserView }) {
  const session = useSession().data;
  const canAssign = useCan("IDENTITY_ROLE_ASSIGN");
  const canReadFacility = useCan("FACILITY_READ");
  const roles = useRoles("FACILITY", canAssign && user.accountType === "STAFF");
  const units = useCurrentFacilityUnits(canReadFacility);
  const assign = useAssignRole();
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AssignRoleFormValues>({
    resolver: zodResolver(assignRoleSchema),
    defaultValues: {
      roleCode: "",
      unitId: "",
      validFrom: "",
      validTo: "",
    },
    mode: "onTouched",
  });

  const submit = handleSubmit(async (values) => {
    if (!session?.facilityId) {
      toast.error("Select a facility before assigning a role");
      return;
    }
    try {
      const result = await assign.mutateAsync(
        toAssignRoleInput(values, user.id, session.facilityId),
      );
      setAssignmentId(result.assignmentId);
      reset({ roleCode: "", unitId: "", validFrom: "", validTo: "" });
      toast.success("Role assignment created");
    } catch (error) {
      const problem = problemOf(error);
      let firstInvalid = false;
      for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
        if (field === "roleCode" || field === "validFrom" || field === "validTo") {
          setError(field, { type: "server", message });
          firstInvalid = true;
        }
      }
      if (!firstInvalid) {
        toast.error(problem.message ?? "Could not assign the role");
      }
    }
  });

  if (!canAssign) return null;

  if (user.accountType !== "STAFF") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role assignment</CardTitle>
          <CardDescription>
            Platform accounts cannot receive facility role assignments.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!session?.facilityId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role assignment</CardTitle>
          <CardDescription>
            Choose a facility before assigning a role.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (session.userId === user.id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role assignment</CardTitle>
          <CardDescription>
            You cannot assign a role to your own account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck aria-hidden="true" className="size-4" />
          Assign a role
        </CardTitle>
        <CardDescription>
          The assignment is scoped to this facility. Privileged roles require a
          second approver; the current API does not list existing assignments
          on this screen, so changes are traceable through audit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignmentId && (
          <Alert>
            <ShieldCheck aria-hidden="true" />
            <AlertTitle>Assignment recorded</AlertTitle>
            <AlertDescription>
              Assignment id:{" "}
              <span className="font-mono text-xs break-all">
                {assignmentId}
              </span>
              . If the role contains privileged permissions, it remains pending
              until a second approver acts.
            </AlertDescription>
          </Alert>
        )}

        {roles.isError && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Could not load facility roles</AlertTitle>
            <AlertDescription>
              <p>
                {problemOf(roles.error).message ??
                  "The backend did not return the role list."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => roles.refetch()}
                disabled={roles.isFetching}
              >
                Retry roles
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="assign-role">Role</Label>
              <Controller
                control={control}
                name="roleCode"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={roles.isPending || roles.isError}
                  >
                    <SelectTrigger
                      id="assign-role"
                      className="w-full"
                      aria-invalid={Boolean(errors.roleCode)}
                    >
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {(roles.data ?? []).map((role) => (
                        <SelectItem key={role.code} value={role.code}>
                          {role.name} ({role.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.roleCode?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-unit">Unit (optional)</Label>
              <Controller
                control={control}
                name="unitId"
                render={({ field }) => (
                  <Select
                    value={field.value || "NONE"}
                    onValueChange={(value) =>
                      field.onChange(value === "NONE" ? "" : value)
                    }
                    disabled={!canReadFacility || units.isPending}
                  >
                    <SelectTrigger id="assign-unit" className="w-full">
                      <SelectValue placeholder="Facility-wide" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Facility-wide</SelectItem>
                      {(units.data ?? [])
                        .filter((unit) => unit.active)
                        .map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name} ({unit.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-from">Valid from (optional)</Label>
              <Input
                id="assign-from"
                type="date"
                aria-invalid={Boolean(errors.validFrom)}
                {...register("validFrom")}
              />
              <FieldError message={errors.validFrom?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-to">Valid to (optional)</Label>
              <Input
                id="assign-to"
                type="date"
                aria-invalid={Boolean(errors.validTo)}
                {...register("validTo")}
              />
              <FieldError message={errors.validTo?.message} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={assign.isPending || roles.isPending || roles.isError}
            >
              {assign.isPending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <UserCheck aria-hidden="true" />
              )}
              Assign role
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UserActivity({ user }: { user: UserView }) {
  const canReadAudit = useCan("AUDIT_READ");
  const [page, setPage] = useState(0);
  const activity = useUserActivity(
    user.id,
    { page, size: ADMIN_PAGE_SIZE },
    canReadAudit,
  );
  const rows = activity.data?.content ?? [];
  const totalPages = activity.data?.totalPages ?? 0;

  if (!canReadAudit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            Audit activity requires AUDIT_READ. The backend does not return it
            to this account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          Audit events recorded for this account, newest first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activity.isError && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Could not load account activity</AlertTitle>
            <AlertDescription>
              {problemOf(activity.error).message ??
                "The backend did not return the activity list."}
            </AlertDescription>
          </Alert>
        )}
        {activity.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : activity.isError ? null : (
          <>
            <AuditEventTable
              events={rows}
              emptyMessage="No audit events were recorded for this account."
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {activity.data?.totalElements ?? 0} event
                {activity.data?.totalElements === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page <= 0 || activity.isFetching}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {Math.max(1, totalPages)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={
                    activity.isFetching ||
                    totalPages === 0 ||
                    page >= totalPages - 1
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function UserDetail({ user }: { user: UserView }) {
  const canReadAudit = useCan("AUDIT_READ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.username}
        description="User account and access administration."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">
              <ArrowLeft aria-hidden="true" />
              Users
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {ACCOUNT_TYPE_LABELS[user.accountType] ?? user.accountType}
        </Badge>
        <Badge variant={statusVariant(user.status)}>
          {ACCOUNT_STATUS_LABELS[user.status] ?? user.status}
        </Badge>
        {user.mfaEnabled && (
          <Badge variant="secondary">
            <ShieldCheck aria-hidden="true" />
            MFA enrolled
          </Badge>
        )}
        {user.mustChangePassword && (
          <Badge variant="destructive">Password change required</Badge>
        )}
      </div>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          {canReadAudit && <TabsTrigger value="activity">Activity</TabsTrigger>}
        </TabsList>

        <TabsContent value="account" className="mt-4 space-y-4">
          <UserSummary user={user} />
          <UserActions user={user} />
        </TabsContent>

        <TabsContent value="access" className="mt-4 space-y-4">
          <AssignRoleCard user={user} />
          <Alert>
            <AlertTitle>Role listings are not available yet</AlertTitle>
            <AlertDescription>
              The current backend exposes role definitions and assignment
              commands, but no per-user assignment list. Existing assignments
              can be reviewed through audit or the approvals workflow when that
              endpoint lands.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {canReadAudit && (
          <TabsContent value="activity" className="mt-4">
            <UserActivity user={user} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
