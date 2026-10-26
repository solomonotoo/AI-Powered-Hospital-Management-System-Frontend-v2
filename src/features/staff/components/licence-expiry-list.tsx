"use client";

import { CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/features/identity/hooks/use-session";
import { formatIsoDate } from "@/lib/format";
import { problemOf } from "@/lib/http";
import { useExpiringLicences } from "../hooks/use-staff";

/**
 * Dashboard licence watch (blueprint 8.7). The backend computes the
 * expiry window; this widget only renders the returned rows so the UI
 * never disagrees with the nightly reminder job.
 */
export function LicenceExpiryList() {
  const allowed = useCan("STAFF_LICENCE_MANAGE");
  const canReadStaff = useCan("STAFF_READ");
  const licences = useExpiringLicences(allowed);

  if (!allowed) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock aria-hidden="true" className="size-4" />
          Licence expiry watch
        </CardTitle>
        <CardDescription>
          Professional licences that have expired or expire soon.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {licences.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : licences.isError ? (
          <p className="text-sm text-destructive">
            {problemOf(licences.error).message ??
              "Could not load the licence watch."}
          </p>
        ) : licences.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No licences are close to expiry.
          </p>
        ) : (
          <ul className="divide-y">
            {licences.data.map((licence) => {
              const content = (
                <>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {licence.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {licence.body} · {licence.number}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={licence.expired ? "destructive" : "outline"}
                    >
                      {licence.expired ? "Expired" : "Expires"}{" "}
                      {formatIsoDate(licence.expiresOn)}
                    </Badge>
                    {canReadStaff && (
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 text-muted-foreground"
                      />
                    )}
                  </div>
                </>
              );

              return (
                <li key={`${licence.staffId}-${licence.body}-${licence.number}`}>
                  {canReadStaff ? (
                    <Link
                      href={`/admin/staff/${licence.staffId}`}
                      className="flex items-center justify-between gap-3 py-2 hover:bg-muted/40"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3 py-2">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
