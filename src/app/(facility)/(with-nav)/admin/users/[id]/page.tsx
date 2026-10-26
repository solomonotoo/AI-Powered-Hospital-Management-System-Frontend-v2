"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { UserDetail } from "@/features/identity/components/user-detail";
import { useUser } from "@/features/identity/hooks/use-users";
import { useSession } from "@/features/identity/hooks/use-session";
import { problemOf } from "@/lib/http";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { data: session, isPending: sessionPending } = useSession();
  const canRead = session?.permissions.includes("IDENTITY_USER_READ") ?? false;
  const user = useUser(userId, canRead);

  if (sessionPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) return null;

  if (!canRead) {
    return (
      <PermissionDenied
        title="User administration access required"
        description="This screen requires the IDENTITY_USER_READ permission. The backend re-checks it on every request."
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

  if (user.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (user.isError || !user.data) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Could not open this account</AlertTitle>
          <AlertDescription>
            {problemOf(user.error).message ??
              "The account may not exist, or you may not have access."}
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/admin/users">
            <ArrowLeft aria-hidden="true" />
            Back to users
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <UserDetail user={user.data} />
    </div>
  );
}
