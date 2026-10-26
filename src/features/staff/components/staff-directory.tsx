"use client";

import Link from "next/link";
import { AlertTriangle, Plus, RefreshCw, Search, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentFacilityUnits } from "@/features/facility/hooks/use-facilities";
import { useCan } from "@/features/identity/hooks/use-session";
import { ADMIN_PAGE_SIZE } from "@/lib/paged";
import { problemOf } from "@/lib/http";
import { useStaffDirectory } from "../hooks/use-staff";
import {
  EMPLOYMENT_STATUS_LABELS,
  STAFF_CATEGORY_LABELS,
  type EmploymentStatus,
  type StaffCategory,
} from "../types";

/**
 * Facility staff directory (blueprint 8.7): server-side search and
 * pagination. The backend scopes every row to the caller's facility from
 * the access token; this table never carries a facility id.
 */
export function StaffDirectory({ canRegister }: { canRegister: boolean }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const directory = useStaffDirectory({
    q: query,
    page,
    size: ADMIN_PAGE_SIZE,
  });
  const canReadFacility = useCan("FACILITY_READ");
  const units = useCurrentFacilityUnits(canReadFacility);

  const unitNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const unit of units.data ?? []) {
      map.set(unit.id, `${unit.name} (${unit.code})`);
    }
    return map;
  }, [units.data]);

  const rows = directory.data?.content ?? [];
  const totalPages = directory.data?.totalPages ?? 0;
  const problem = directory.isError ? problemOf(directory.error) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRound aria-hidden="true" className="size-4" />
          Workforce directory
        </CardTitle>
        <CardDescription>
          Search by staff number or name. Licence documents stay on the
          individual record.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff number or name"
              className="pl-8"
              aria-label="Search staff"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => directory.refetch()}
              disabled={directory.isFetching}
            >
              <RefreshCw
                aria-hidden="true"
                className={directory.isFetching ? "animate-spin" : undefined}
              />
              Refresh
            </Button>
            {canRegister && (
              <Button asChild size="sm">
                <Link href="/admin/staff/new">
                  <Plus aria-hidden="true" />
                  Register staff
                </Link>
              </Button>
            )}
          </div>
        </div>

        {problem && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Could not load the staff directory</AlertTitle>
            <AlertDescription>
              {problem.message ?? "The backend did not return the directory."}
            </AlertDescription>
          </Alert>
        )}

        {directory.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : problem ? null : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-10 text-center">
            <p className="font-medium">
              {query ? "No staff match this search" : "No staff records yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query
                ? "Try a different staff number or name."
                : canRegister
                  ? "Register the first workforce record to begin."
                  : "Ask a facility administrator to register staff."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Primary unit</TableHead>
                    <TableHead>Licence</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-mono text-xs">
                        {staff.staffNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        {staff.displayName}
                      </TableCell>
                      <TableCell>
                        {STAFF_CATEGORY_LABELS[
                          staff.category as StaffCategory
                        ] ?? staff.category}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            staff.employmentStatus === "ACTIVE"
                              ? "secondary"
                              : staff.employmentStatus === "TERMINATED"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {EMPLOYMENT_STATUS_LABELS[
                            staff.employmentStatus as EmploymentStatus
                          ] ?? staff.employmentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {staff.primaryUnitId
                          ? (unitNames.get(staff.primaryUnitId) ??
                            staff.primaryUnitId)
                          : "Not posted"}
                      </TableCell>
                      <TableCell>
                        {staff.licenceExpiring ? (
                          <Badge variant="destructive">
                            <AlertTriangle aria-hidden="true" />
                            Expiring
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Clear
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/staff/${staff.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {directory.data?.totalElements ?? 0} staff record
                {directory.data?.totalElements === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page <= 0 || directory.isFetching}
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
                    directory.isFetching ||
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
