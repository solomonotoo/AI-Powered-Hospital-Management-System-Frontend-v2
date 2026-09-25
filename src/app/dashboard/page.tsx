"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logout } from "@/features/identity/api/auth";
import { useSession } from "@/features/identity/hooks/use-session";

// Temporary landing: proves useSession end-to-end (user, facility,
// permissions from the live backend) until the role dashboards land in
// Slice 3. Shows raw session facts deliberately — this page becomes the
// facility switcher + module launcher.
export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isLoading, isError } = useSession();

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </main>
    );
  }

  if (isError || !session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Session expired — please sign in again.</p>
        <Button onClick={() => router.replace("/login")}>Go to login</Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome, {session.username}</CardTitle>
          <CardDescription>
            {session.accountType} ·{" "}
            {session.facilityId ? `Facility ${session.facilityId.slice(0, 8)}…` : "Platform scope"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">Effective permissions ({session.permissions.length})</p>
            <p className="text-sm text-muted-foreground break-words">
              {session.permissions.length > 0 ? session.permissions.join(", ") : "None yet"}
            </p>
          </div>
          {session.mustChangePassword && (
            <p className="text-sm text-destructive">Password change still required.</p>
          )}
          <Button variant="outline" onClick={onLogout}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
