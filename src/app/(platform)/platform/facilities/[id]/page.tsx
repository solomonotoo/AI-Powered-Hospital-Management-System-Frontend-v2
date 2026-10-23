"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, ClipboardCheck, History, Users } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FacilityStatusBadge } from "@/features/facility/components/facility-status-badge";
import { FirstAdminInvite } from "@/features/facility/components/first-admin-invite";
import { ReadinessChecklist } from "@/features/facility/components/readiness-checklist";
import { StatusHistory } from "@/features/facility/components/status-history";
import {
  useFacility,
  useFacilityReadiness,
} from "@/features/facility/hooks/use-facilities";
import {
  FACILITY_OWNERSHIP_LABELS,
  FACILITY_STATUS_LABELS,
  FACILITY_TYPE_LABELS,
} from "@/features/facility/types";
import { useSession } from "@/features/identity/hooks/use-session";
import { problemOf } from "@/lib/http";
import { cn } from "@/lib/utils";

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="mt-6 h-72 w-full" />
    </div>
  );
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-sm break-words",
          mono && "font-mono text-xs",
          !value && "text-muted-foreground",
        )}
      >
        {value && value.length > 0 ? value : "—"}
      </dd>
    </div>
  );
}

export default function FacilityDetailPage() {
  const params = useParams<{ id: string }>();
  const facilityId = Array.isArray(params?.id) ? (params.id[0] ?? "") : (params?.id ?? "");
  const { data: session, isPending } = useSession();
  const canRead = session?.permissions.includes("FACILITY_READ") ?? false;
  const canCheckReadiness =
    session?.permissions.includes("FACILITY_UPDATE") ?? false;
  const canInvite = session?.permissions.includes("IDENTITY_USER_INVITE") ?? false;

  const [tab, setTab] = useState("overview");
  const facilityQuery = useFacility(facilityId, canRead);
  const readinessQuery = useFacilityReadiness(
    facilityId,
    canCheckReadiness && tab === "readiness",
  );

  if (isPending) return <DetailSkeleton />;
  if (!session) return null;

  if (!canRead) {
    return (
      <PermissionDenied
        title="Facility detail access required"
        description="This screen requires the FACILITY_READ permission."
        action={
          <Button asChild variant="outline">
            <Link href="/platform/facilities">
              <ArrowLeft aria-hidden="true" />
              Back to facilities
            </Link>
          </Button>
        }
      />
    );
  }

  if (facilityQuery.isPending) return <DetailSkeleton />;

  if (facilityQuery.isError) {
    const problem = problemOf(facilityQuery.error);
    const notFound =
      problem.status === 404 ||
      problem.code === "NOT_FOUND" ||
      problem.code === "FACILITY_NOT_FOUND";

    return (
      <>
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/platform/facilities">
              <ArrowLeft aria-hidden="true" />
              Back to facilities
            </Link>
          </Button>
        </div>
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>
              {notFound ? "Facility not found" : "Could not load the facility"}
            </CardTitle>
            <CardDescription>
              {problem.message ??
                (notFound
                  ? "The facility id is unknown."
                  : "The facility registry is unavailable.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {!notFound && (
              <Button
                variant="outline"
                disabled={facilityQuery.isFetching}
                onClick={() => void facilityQuery.refetch()}
              >
                Retry
              </Button>
            )}
            <Button asChild>
              <Link href="/platform/facilities">Back to facilities</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const facility = facilityQuery.data;
  const address = [
    facility.addressLine1,
    facility.addressLine2,
    facility.addressCity,
    facility.addressCountry,
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/platform/facilities">
            <ArrowLeft aria-hidden="true" />
            Back to facilities
          </Link>
        </Button>
      </div>

      <PageHeader
        title={facility.name}
        description={`${facility.code} · ${FACILITY_TYPE_LABELS[facility.type] ?? facility.type} · ${facility.region ?? "Region not recorded"}`}
        actions={<FacilityStatusBadge status={facility.status} />}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Building2 aria-hidden="true" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="readiness">
            <ClipboardCheck aria-hidden="true" />
            Readiness
          </TabsTrigger>
          <TabsTrigger value="admin">
            <Users aria-hidden="true" />
            Admin users
          </TabsTrigger>
          <TabsTrigger value="history">
            <History aria-hidden="true" />
            Status history
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Facility profile</CardTitle>
              <CardDescription>
                Registry metadata returned by the platform facility endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Fact label="Facility id" value={facility.id} mono />
                <Fact label="Code" value={facility.code} mono />
                <Fact
                  label="Type"
                  value={FACILITY_TYPE_LABELS[facility.type] ?? facility.type}
                />
                <Fact
                  label="Status"
                  value={FACILITY_STATUS_LABELS[facility.status] ?? facility.status}
                />
                <Fact label="Region" value={facility.region} />
                <Fact label="District" value={facility.district} />
                <Fact
                  label="Ownership"
                  value={
                    FACILITY_OWNERSHIP_LABELS[facility.ownership] ??
                    facility.ownership
                  }
                />
                <Fact label="Timezone" value={facility.timezone} />
                <Fact label="Address" value={address} />
                <Fact label="Contact phone" value={facility.contactPhone} />
                <Fact label="Contact email" value={facility.contactEmail} />
                <Fact label="Licence number" value={facility.licenceNumber} />
                <Fact label="Licence body" value={facility.licenceBody} />
                <Fact
                  label="NHIA accreditation"
                  value={facility.nhiaAccreditationCode}
                />
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                Creation date is not available in this console yet.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness" className="mt-4">
          {!canCheckReadiness ? (
            <Alert>
              <AlertTitle>Readiness permission required</AlertTitle>
              <AlertDescription>
                This checklist requires the FACILITY_UPDATE permission. The backend
                re-checks it on every request.
              </AlertDescription>
            </Alert>
          ) : readinessQuery.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : readinessQuery.isError ? (
            <Card>
              <CardHeader>
                <CardTitle>Could not run the readiness check</CardTitle>
                <CardDescription>
                  {problemOf(readinessQuery.error).message ??
                    "The readiness checklist is unavailable."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  disabled={readinessQuery.isFetching}
                  onClick={() => void readinessQuery.refetch()}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Go-live readiness</CardTitle>
                <CardDescription>
                  The backend evaluates these checks again when go-live is requested.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReadinessChecklist items={readinessQuery.data} />
                <p className="mt-4 text-xs text-muted-foreground">
                  Readiness is read-only in this console. The facility administrator
                  takes the facility live from the facility setup screen once every
                  check passes.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="admin" className="mt-4 space-y-4">
          {!canInvite ? (
            <Alert>
              <AlertTitle>Invitation permission required</AlertTitle>
              <AlertDescription>
                This screen requires the IDENTITY_USER_INVITE permission.
              </AlertDescription>
            </Alert>
          ) : (
            <FirstAdminInvite
              facilityId={facility.id}
              facilityName={facility.name}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Existing administrators are not listed here yet: the platform tier does not
            hold the identity user-read permission.
          </p>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <StatusHistory facilityId={facility.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
