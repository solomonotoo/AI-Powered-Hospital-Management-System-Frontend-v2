"use client";

import Link from "next/link";
import { LayoutDashboard, Network } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UnitTree } from "@/features/facility/components/unit-tree";
import { useSession } from "@/features/identity/hooks/use-session";

/**
 * Unit tree editor (blueprint 8.6 /admin/units).
 *
 * Mutations require FACILITY_UNIT_MANAGE; reads use FACILITY_READ. The
 * backend scopes every unit call to the caller's facility from the
 * access token.
 */
export default function FacilityUnitsPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) return null;

  if (!session.facilityId) {
    return (
      <PermissionDenied
        title="Select a facility first"
        description="Unit management is scoped to one facility. Choose the facility you want to manage."
        action={
          <Button asChild>
            <Link href="/select-facility">Choose a facility</Link>
          </Button>
        }
      />
    );
  }

  if (!session.permissions.includes("FACILITY_UNIT_MANAGE")) {
    return (
      <PermissionDenied
        title="Unit management access required"
        description="This screen requires the FACILITY_UNIT_MANAGE permission. The backend re-checks it on every request."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden="true" />
              Back to dashboard
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Organization units"
        description="Maintain the departments, clinics, wards and service points that visits, orders and cashier shifts attach to."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/setup">
              <Network aria-hidden="true" />
              Setup &amp; go-live
            </Link>
          </Button>
        }
      />

      <UnitTree />
    </div>
  );
}
