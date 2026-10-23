"use client";

import Link from "next/link";
import { ClipboardCheck, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PrintProfileForm } from "@/features/configuration/components/print-profile-form";
import { useSession } from "@/features/identity/hooks/use-session";

/**
 * Print profile setup (blueprint 8.6 /admin/setup/print-profile).
 *
 * Reads require CONFIG_READ; writes require CONFIG_UPDATE. The backend
 * reads the facility from the access token, so this page never carries a
 * facility id.
 */
export default function PrintProfilePage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
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
        description="The print profile is scoped to one facility. Choose the facility you want to configure."
        action={
          <Button asChild>
            <Link href="/select-facility">Choose a facility</Link>
          </Button>
        }
      />
    );
  }

  if (!session.permissions.includes("CONFIG_READ")) {
    return (
      <PermissionDenied
        title="Configuration access required"
        description="This screen requires the CONFIG_READ permission. The backend re-checks it on every request."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <Printer aria-hidden="true" />
              Back to dashboard
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Print profile"
        description="The letterhead and receipt footer used on every printed document."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/setup">
              <ClipboardCheck aria-hidden="true" />
              Setup &amp; go-live
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Printer aria-hidden="true" className="size-4" />
          Changes are audited and apply to documents printed after saving.
        </div>
        <PrintProfileForm />
      </div>
    </div>
  );
}
