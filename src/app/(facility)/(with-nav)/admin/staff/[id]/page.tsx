"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { useSession } from "@/features/identity/hooks/use-session";
import { StaffDetail } from "@/features/staff/components/staff-detail";
import { useStaff } from "@/features/staff/hooks/use-staff";
import { problemOf } from "@/lib/http";

export default function StaffDetailPage() {
  const params = useParams<{ id: string }>();
  const staffId = params.id;
  const { data: session, isPending: sessionPending } = useSession();
  const canRead = session?.permissions.includes("STAFF_READ") ?? false;
  const staff = useStaff(staffId, canRead);

  if (sessionPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) return null;

  if (!canRead) {
    return (
      <PermissionDenied
        title="Staff record access required"
        description="This screen requires the STAFF_READ permission. The backend also checks that the record belongs to your facility."
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

  if (staff.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (staff.isError || !staff.data) {
    const problem = problemOf(staff.error);
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Could not open this staff record</AlertTitle>
          <AlertDescription>
            {problem.message ??
              "The record may not exist, or it may belong to another facility."}
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/admin/staff">
            <ArrowLeft aria-hidden="true" />
            Back to staff directory
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <StaffDetail staff={staff.data} />
    </div>
  );
}
