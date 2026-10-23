"use client";

import Link from "next/link";
import { Building2, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FacilityProfileForm } from "@/features/facility/components/facility-profile-form";
import { useSession } from "@/features/identity/hooks/use-session";

/**
 * Facility profile editor (blueprint 8.6 /admin/facility).
 *
 * The backend scopes every call to the caller's facility from the
 * access token, so this page never carries a facility id.
 */
export default function FacilityProfilePage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
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
        description="Facility profile editing is scoped to one facility. Choose the facility you want to manage."
        action={
          <Button asChild>
            <Link href="/select-facility">Choose a facility</Link>
          </Button>
        }
      />
    );
  }

  if (!session.permissions.includes("FACILITY_UPDATE")) {
    return (
      <PermissionDenied
        title="Facility profile access required"
        description="This screen requires the FACILITY_UPDATE permission. The backend re-checks it on every request."
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
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Facility profile"
        description="Keep the facility registry identity, location, contacts and licence details current."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 aria-hidden="true" className="size-4" />
          Changes are audited and never alter the facility code or lifecycle status.
        </div>
        <FacilityProfileForm />
      </div>
    </div>
  );
}
