"use client";

import { ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { problemOf } from "@/lib/http";
import { useFacilityAdminUsers } from "../hooks/use-facility-admin-users";

// Ghana display timezone (blueprint 28): the backend stores Instants and
// this platform view renders them in Africa/Accra regardless of the
// workstation.
const accraDateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Accra",
});

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : accraDateTime.format(date);
}

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  INVITED: "Invited",
  ACTIVE: "Active",
  LOCKED: "Locked",
  DISABLED: "Disabled",
};

const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PENDING_APPROVAL: "Pending approval",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
};

const ROLE_LABELS: Record<string, string> = {
  FACILITY_ADMIN: "Facility administrator",
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

function accountStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "INVITED":
      return "secondary";
    case "LOCKED":
    case "DISABLED":
      return "destructive";
    default:
      return "outline";
  }
}

function assignmentStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "PENDING_APPROVAL":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Platform facility-detail "Admin users" tab (blueprint 8.6).
 *
 * Read-only, facility-scoped and secret-free: the backend returns only
 * FACILITY_ADMIN grants for this facility. The platform tier never
 * receives the global identity directory or credential material.
 */
export function FacilityAdminUsers({ facilityId }: { facilityId: string }) {
  const query = useFacilityAdminUsers(facilityId);

  if (query.isPending) return <Skeleton className="h-56 w-full" />;

  if (query.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load the administrators</CardTitle>
          <CardDescription>
            {problemOf(query.error).message ??
              "The facility administrator summary is unavailable."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const admins = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users aria-hidden="true" className="size-4" />
          Administrators
        </CardTitle>
        <CardDescription>
          Current FACILITY_ADMIN grants for this facility. This is a
          platform-safe, read-only summary: no credentials, patient data or
          clinical records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {admins.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
            <Users aria-hidden="true" className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">No administrator provisioned</p>
              <p className="text-sm text-muted-foreground">
                A first-administrator invitation creates the bootstrap
                FACILITY_ADMIN grant for this facility.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead>Last login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow
                    key={`${admin.userId}:${admin.roleCode}:${admin.assignmentStatus}:${admin.validFrom}`}
                  >
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{admin.username}</span>
                        {admin.bootstrapGrant && (
                          <Badge variant="outline">First admin</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {admin.staffLinked
                          ? "Staff record linked"
                          : "Staff link pending"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={accountStatusVariant(admin.accountStatus)}>
                        {ACCOUNT_STATUS_LABELS[admin.accountStatus] ??
                          admin.accountStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant={assignmentStatusVariant(
                            admin.assignmentStatus,
                          )}
                        >
                          {ASSIGNMENT_STATUS_LABELS[admin.assignmentStatus] ??
                            admin.assignmentStatus}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {ROLE_LABELS[admin.roleCode] ?? admin.roleCode}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <p>{formatDateTime(admin.validFrom)}</p>
                      <p className="text-muted-foreground">
                        {admin.validTo
                          ? `Until ${formatDateTime(admin.validTo)}`
                          : "No end date"}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="flex items-center gap-1">
                        <ShieldCheck aria-hidden="true" className="size-3.5" />
                        {admin.mfaEnabled ? "MFA enabled" : "MFA not enabled"}
                      </p>
                      {admin.mustChangePassword && (
                        <p className="text-amber-600 dark:text-amber-400">
                          Password change pending
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDateTime(admin.lastLoginAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
