"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/identity/hooks/use-session";
import { StaffRegistrationForm } from "@/features/staff/components/staff-registration-form";

export default function NewStaffPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) return null;

  if (!session.permissions.includes("STAFF_REGISTER")) {
    return (
      <PermissionDenied
        title="Staff registration access required"
        description="This screen requires the STAFF_REGISTER permission. The backend re-checks it when the record is submitted."
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
        title="Register staff"
        description="Create the workforce record; link a login account after the person is invited."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/staff">
              <ArrowLeft aria-hidden="true" />
              Directory
            </Link>
          </Button>
        }
      />
      <StaffRegistrationForm />
    </div>
  );
}
