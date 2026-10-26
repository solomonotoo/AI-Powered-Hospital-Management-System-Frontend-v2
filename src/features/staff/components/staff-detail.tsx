"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  IdCard,
  Loader2,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { useCurrentFacilityUnits } from "@/features/facility/hooks/use-facilities";
import type { UnitView } from "@/features/facility/types";
import { useCan } from "@/features/identity/hooks/use-session";
import { formatIsoDate } from "@/lib/format";
import { problemOf } from "@/lib/http";
import { useLinkStaffUser } from "../hooks/use-staff";
import {
  EMPLOYMENT_STATUS_LABELS,
  STAFF_CATEGORY_LABELS,
  type EmploymentStatus,
  type StaffDetailView,
} from "../types";
import { StaffLicenceDialog } from "./staff-licence-dialog";
import { StaffPostingDialog } from "./staff-posting-dialog";
import { StaffProfileForm } from "./staff-profile-form";
import { StaffStatusDialog } from "./staff-status-dialog";

function statusVariant(status: string) {
  if (status === "ACTIVE") return "secondary" as const;
  if (status === "TERMINATED") return "destructive" as const;
  return "outline" as const;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function ProfileSummary({ staff }: { staff: StaffDetailView }) {
  const address = [
    staff.addressLine1,
    staff.addressLine2,
    staff.addressCity,
    staff.addressState,
    staff.addressPostalCode,
    staff.addressCountry,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailRow label="Staff number">{staff.staffNumber}</DetailRow>
        <DetailRow label="Full name">{staff.displayName}</DetailRow>
        <DetailRow label="Preferred name">
          {staff.preferredName || "—"}
        </DetailRow>
        <DetailRow label="Category">
          {STAFF_CATEGORY_LABELS[staff.category] ?? staff.category}
        </DetailRow>
        <DetailRow label="Specialty">{staff.specialty || "—"}</DetailRow>
        <DetailRow label="Date of birth">
          {formatIsoDate(staff.dateOfBirth)}
        </DetailRow>
        <DetailRow label="Phone">{staff.phone}</DetailRow>
        <DetailRow label="Email">{staff.email || "—"}</DetailRow>
        <DetailRow label="Address">{address || "—"}</DetailRow>
      </dl>

      {staff.qualifications.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Qualifications</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {staff.qualifications.map((qualification, index) => (
                <li key={`${qualification.name}-${index}`}>
                  {qualification.name}
                  {qualification.institution
                    ? ` — ${qualification.institution}`
                    : ""}
                  {qualification.yearAwarded
                    ? ` (${qualification.yearAwarded})`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function LicenceSection({ staff }: { staff: StaffDetailView }) {
  const canManage = useCan("STAFF_LICENCE_MANAGE");
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck aria-hidden="true" className="size-4" />
            Professional licences
          </CardTitle>
          <CardDescription>
            Licence renewals append a new row; the historical record is kept.
          </CardDescription>
        </div>
        {canManage && (
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            Add licence
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {staff.licences.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
            No licences recorded.{canManage ? " Add the first one." : ""}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Body</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.licences.map((licence, index) => (
                  <TableRow key={`${licence.body}-${licence.number}-${index}`}>
                    <TableCell className="font-medium">{licence.body}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {licence.number}
                    </TableCell>
                    <TableCell>{formatIsoDate(licence.issuedOn)}</TableCell>
                    <TableCell>{formatIsoDate(licence.expiresOn)}</TableCell>
                    <TableCell>
                      {licence.expired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : licence.expiringSoon ? (
                        <Badge variant="outline">
                          <CalendarClock aria-hidden="true" />
                          Expiring soon
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Valid</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <StaffLicenceDialog
        staffId={staff.id}
        open={open}
        onOpenChange={setOpen}
      />
    </Card>
  );
}

function PostingSection({
  staff,
  units,
  unitsLoading,
}: {
  staff: StaffDetailView;
  units: UnitView[];
  unitsLoading: boolean;
}) {
  const canAssign = useCan("STAFF_ASSIGN");
  const canReadFacility = useCan("FACILITY_READ");
  const [open, setOpen] = useState(false);

  const unitNames = new Map(
    units.map((unit) => [unit.id, `${unit.name} (${unit.code})`]),
  );
  const activeUnits = units.filter((unit) => unit.active);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 aria-hidden="true" className="size-4" />
            Postings
          </CardTitle>
          <CardDescription>
            A posting is the unit a person works in for a period. Primary
            postings end when a new primary posting starts.
          </CardDescription>
        </div>
        {canAssign && (
          <Button
            type="button"
            size="sm"
            onClick={() => setOpen(true)}
            disabled={unitsLoading || activeUnits.length === 0}
          >
            Add posting
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {staff.assignments.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
            No postings recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.assignments.map((assignment, index) => (
                  <TableRow key={`${assignment.unitId}-${assignment.from}-${index}`}>
                    <TableCell className="font-medium">
                      {unitNames.get(assignment.unitId) ?? assignment.unitId}
                    </TableCell>
                    <TableCell>{formatIsoDate(assignment.from)}</TableCell>
                    <TableCell>
                      {assignment.to ? formatIsoDate(assignment.to) : "—"}
                    </TableCell>
                    <TableCell>
                      {assignment.primary ? (
                        <Badge variant="secondary">Primary</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={assignment.open ? "outline" : "secondary"}>
                        {assignment.open ? "Open" : "Closed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {!canReadFacility && (
          <p className="mt-3 text-xs text-muted-foreground">
            Unit names require facility read access. The posting unit ids are
            shown when names are unavailable.
          </p>
        )}
      </CardContent>
      <StaffPostingDialog
        staffId={staff.id}
        units={activeUnits}
        open={open}
        onOpenChange={setOpen}
      />
    </Card>
  );
}

function AccessSection({ staff }: { staff: StaffDetailView }) {
  const canUpdate = useCan("STAFF_UPDATE");
  const canReadUsers = useCan("IDENTITY_USER_READ");
  const canInviteUsers = useCan("IDENTITY_USER_INVITE");
  const link = useLinkStaffUser();
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const trimmed = userId.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      setError("Enter the user account id (a UUID).");
      return;
    }
    try {
      await link.mutateAsync({ staffId: staff.id, userId: trimmed });
      toast.success("Staff record linked to the account");
      setUserId("");
    } catch (problem) {
      setError(problemOf(problem).message ?? "Could not link the account");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck aria-hidden="true" className="size-4" />
          Account access
        </CardTitle>
        <CardDescription>
          The staff record and the login account are separate. Linking is a
          one-time operation and does not grant permissions by itself.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {staff.userId ? (
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">Linked account</p>
            <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
              {staff.userId}
            </p>
            {canReadUsers && (
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href={`/admin/users/${staff.userId}`}>
                  Open user account
                </Link>
              </Button>
            )}
          </div>
        ) : canUpdate ? (
          <form noValidate onSubmit={submit} className="space-y-2">
            <Label htmlFor="link-user-id">User account id</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="link-user-id"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="Paste the user id from the user directory"
                aria-invalid={Boolean(error)}
                className="font-mono text-xs"
              />
              <Button type="submit" disabled={link.isPending}>
                {link.isPending && (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                )}
                Link account
              </Button>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Invite the account first, then paste its id here.{" "}
              {canReadUsers && (
                <Link href="/admin/users" className="underline">
                  Open the user directory
                </Link>
              )}
              {!canReadUsers && canInviteUsers
                ? " You can still invite users from the Users screen if that route is available."
                : null}
            </p>
          </form>
        ) : (
          <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
            This staff record is not linked to a login account.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Staff detail (blueprint 8.7). Reads the full record once and keeps
 * tab data in the same query cache; every mutation invalidates the detail
 * so licence/status/posting history cannot go stale.
 */
export function StaffDetail({ staff }: { staff: StaffDetailView }) {
  const canUpdate = useCan("STAFF_UPDATE");
  const canManageStatus = useCan("STAFF_STATUS_MANAGE");
  const canReadFacility = useCan("FACILITY_READ");
  const units = useCurrentFacilityUnits(canReadFacility);
  const [statusOpen, setStatusOpen] = useState(false);

  const employmentStatus =
    EMPLOYMENT_STATUS_LABELS[staff.employmentStatus as EmploymentStatus] ??
    staff.employmentStatus;

  return (
    <div className="space-y-6">
      <PageHeader
        title={staff.displayName}
        description={`${staff.staffNumber} · ${
          STAFF_CATEGORY_LABELS[staff.category] ?? staff.category
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/staff">
                <ArrowLeft aria-hidden="true" />
                Directory
              </Link>
            </Button>
            {canManageStatus && staff.employmentStatus !== "TERMINATED" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatusOpen(true)}
              >
                <ShieldAlert aria-hidden="true" />
                Change status
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(staff.employmentStatus)}>
          {employmentStatus}
        </Badge>
        {staff.licenceExpiring && (
          <Badge variant="destructive">
            <CalendarClock aria-hidden="true" />
            Licence expiring
          </Badge>
        )}
        {staff.primaryUnitId && (
          <Badge variant="outline">
            <IdCard aria-hidden="true" />
            Primary unit set
          </Badge>
        )}
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="licences">Licences</TabsTrigger>
          <TabsTrigger value="postings">Postings</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Identity and contact details. The occupational category is
                fixed after registration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canUpdate ? (
                <StaffProfileForm staff={staff} />
              ) : (
                <ProfileSummary staff={staff} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="licences" className="mt-4">
          <LicenceSection staff={staff} />
        </TabsContent>

        <TabsContent value="postings" className="mt-4">
          {canReadFacility && units.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <PostingSection
              staff={staff}
              units={units.data ?? []}
              unitsLoading={canReadFacility && units.isPending}
            />
          )}
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          <AccessSection staff={staff} />
        </TabsContent>
      </Tabs>

      {canManageStatus && staff.employmentStatus !== "TERMINATED" && (
        <StaffStatusDialog
          staff={staff}
          open={statusOpen}
          onOpenChange={setStatusOpen}
        />
      )}
    </div>
  );
}
