"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/identity/hooks/use-session";
import { StaffDirectory } from "@/features/staff/components/staff-directory";

/**
 * Staff directory (blueprint 8.7). The read gate is explicit so a user
 * without STAFF_READ never sees an empty table that looks like a data
 * problem; the backend still authorizes the list request.
 */
export default function StaffDirectoryPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!session) return null;

  if (!session.permissions.includes("STAFF_READ")) {
    return (
      <PermissionDenied
        title="Staff directory access required"
        description="This screen requires the STAFF_READ permission. The backend re-checks it on every request."
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
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Staff"
        description="Workforce records, licences and unit postings for this facility."
      />
      <StaffDirectory
        canRegister={session.permissions.includes("STAFF_REGISTER")}
      />
    </div>
  );
}
