"use client";

import { Building2, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { useLogout } from "@/features/identity/hooks/use-auth";
import { useSession } from "@/features/identity/hooks/use-session";

// Platform console landing. Deliberately does not render the facility
// shell: the platform owner has no clinical workspace.
//
// Facility administration screens are Phase 0.10. This page exists so
// platform accounts have a correct, audited landing instead of falling
// into facility routes.
export default function PlatformPage() {
  const { data: session } = useSession();
  const logout = useLogout();

  if (!session) return null;

  return (
    <main className="min-h-screen bg-muted/40">
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <span className="text-sm font-semibold">HMS Platform</span>
        </div>
        <Button variant="ghost" size="sm" disabled={logout.isPending} onClick={() => logout.mutate()}>
          <LogOut />
          {logout.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </header>

      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <PageHeader
          title={`Platform console`}
          description={`Signed in as ${session.username}. Platform accounts cannot open patient or clinical records.`}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4" />
                Facility administration
              </CardTitle>
              <CardDescription>
                Registering facilities, readiness checks and go-live arrive with the Phase 0.10
                admin foundation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No platform modules are enabled yet.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session facts</CardTitle>
              <CardDescription>Confirmed by the backend on page load.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Account type: </span>
                {session.accountType}
              </p>
              <p>
                <span className="text-muted-foreground">Permissions: </span>
                {session.permissions.length}
              </p>
              <p className="text-muted-foreground">
                Facility scope is unavailable to platform accounts by design.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
