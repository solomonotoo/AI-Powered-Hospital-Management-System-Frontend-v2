"use client";

import Link from "next/link";
import { Building2, KeyRound, ShieldCheck } from "lucide-react";
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const logout = useLogout();

  // The facility layout's SessionGate guarantees a session; rendering
  // nothing while it finishes avoids a flash of placeholder content.
  if (!session) return null;

  const facilityIndex = session.facilityId
    ? session.facilities.indexOf(session.facilityId)
    : -1;
  const facilityLabel = session.facilityId
    ? `${facilityIndex >= 0 ? `Facility ${facilityIndex + 1}` : "Facility"} · ${session.facilityId}`
    : "Not selected";

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title={`Welcome, ${session.username}`}
        description="Your facility workspace. Modules appear here as their implementation phase is approved."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/account/security">
                <ShieldCheck />
                Security
              </Link>
            </Button>
            <Button variant="ghost" disabled={logout.isPending} onClick={() => logout.mutate()}>
              {logout.isPending ? "Signing out…" : "Sign out"}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Signed in as</CardDescription>
            <CardTitle className="truncate">{session.username}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {session.accountType === "STAFF" ? "Staff account" : "Platform account"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Facility scope</CardDescription>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="size-4 shrink-0" />
              <span className="truncate font-mono">{facilityLabel}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {session.facilities.length} assigned facilit
            {session.facilities.length === 1 ? "y" : "ies"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Effective permissions</CardDescription>
            <CardTitle>{session.permissions.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Enforced again by the backend on every request.
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Account security
          </CardTitle>
          <CardDescription>
            Two-step verification is required for privileged roles. You can also change your
            password from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/account/security">Manage security</Link>
          </Button>
        </CardContent>
      </Card>

      {session.permissions.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Permission catalogue in this session</CardTitle>
            <CardDescription>
              Shown for support and access reviews. UI hiding is convenience only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-1.5">
              {session.permissions.map((permission) => (
                <li
                  key={permission}
                  className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
                >
                  {permission}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
