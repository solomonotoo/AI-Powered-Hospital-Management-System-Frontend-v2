"use client";

import Link from "next/link";
import { Building2, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FacilityStatusBadge } from "@/features/facility/components/facility-status-badge";
import { useFacilities } from "@/features/facility/hooks/use-facilities";
import { FACILITY_TYPE_LABELS } from "@/features/facility/types";
import { useSession } from "@/features/identity/hooks/use-session";
import { problemOf } from "@/lib/http";

function ListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="mt-6 h-64 w-full" />
    </div>
  );
}

export default function FacilitiesPage() {
  const { data: session, isPending } = useSession();
  const canList = session?.permissions.includes("FACILITY_LIST_ALL") ?? false;
  const canRegister = session?.permissions.includes("FACILITY_REGISTER") ?? false;
  const facilitiesQuery = useFacilities(canList);
  const [search, setSearch] = useState("");

  const facilities = useMemo(
    () => facilitiesQuery.data ?? [],
    [facilitiesQuery.data],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length === 0) return facilities;
    return facilities.filter((facility) =>
      [facility.name, facility.code, facility.region ?? "", facility.district ?? ""].some(
        (value) => value.toLowerCase().includes(term),
      ),
    );
  }, [facilities, search]);

  if (isPending) return <ListSkeleton />;
  if (!session) return null;

  if (!canList) {
    return (
      <PermissionDenied
        title="Facility registry access required"
        description="This screen requires the FACILITY_LIST_ALL permission. Platform accounts without it cannot browse the registry."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Facilities"
        description="Platform-wide facility registry. Clinical, patient and billing data are never shown here."
        actions={
          canRegister ? (
            <Button asChild>
              <Link href="/platform/facilities/new">
                <Plus aria-hidden="true" />
                Register facility
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Registry</CardTitle>
          <CardDescription>
            {facilities.length === 0
              ? "No facilities have been registered."
              : `${facilities.length} ${facilities.length === 1 ? "facility" : "facilities"} registered.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {facilitiesQuery.isPending ? (
            <Skeleton className="h-56 w-full" />
          ) : facilitiesQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load facilities</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  {problemOf(facilitiesQuery.error).message ??
                    "The facility registry is unavailable."}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={facilitiesQuery.isFetching}
                  onClick={() => void facilitiesQuery.refetch()}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : facilities.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
              <Building2 aria-hidden="true" className="size-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium">No facilities yet</p>
                <p className="text-sm text-muted-foreground">
                  Register the first facility to start Day-0 provisioning.
                </p>
              </div>
              {canRegister && (
                <Button asChild>
                  <Link href="/platform/facilities/new">
                    <Plus aria-hidden="true" />
                    Register facility
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
                  />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Filter by name, code or region"
                    aria-label="Filter facilities"
                    className="pl-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {filtered.length} of {facilities.length} shown
                </p>
              </div>

              {filtered.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No facilities match “{search.trim()}”.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Facility</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Licence</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((facility) => (
                        <TableRow key={facility.id}>
                          <TableCell>
                            <Link
                              href={`/platform/facilities/${facility.id}`}
                              className="font-medium hover:underline"
                            >
                              {facility.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {facility.district ?? "District not recorded"}
                            </p>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {facility.code}
                          </TableCell>
                          <TableCell>
                            {FACILITY_TYPE_LABELS[facility.type] ?? facility.type}
                          </TableCell>
                          <TableCell>{facility.region ?? "—"}</TableCell>
                          <TableCell>{facility.licenceNumber ?? "—"}</TableCell>
                          <TableCell>
                            <FacilityStatusBadge status={facility.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
