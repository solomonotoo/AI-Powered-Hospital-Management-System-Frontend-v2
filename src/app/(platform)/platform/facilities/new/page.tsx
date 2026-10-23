"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RegisterFacilityWizard } from "@/features/facility/components/register-facility-wizard";
import { useSession } from "@/features/identity/hooks/use-session";

export default function NewFacilityPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="mt-6 h-96 w-full max-w-3xl" />
      </div>
    );
  }
  if (!session) return null;

  if (!session.permissions.includes("FACILITY_REGISTER")) {
    return (
      <PermissionDenied
        title="Registration permission required"
        description="This screen requires the FACILITY_REGISTER permission. Registering a facility is a platform-admin action."
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
        title="Register facility"
        description="Create the facility in Provisioning. Readiness and the first administrator come next."
      />

      <div className="max-w-3xl">
        <RegisterFacilityWizard />
      </div>
    </>
  );
}
