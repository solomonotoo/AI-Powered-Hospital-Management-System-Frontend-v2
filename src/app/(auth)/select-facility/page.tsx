"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSelectFacility } from "@/features/identity/hooks/use-auth";
import { useSession } from "@/features/identity/hooks/use-session";
import { toast } from "sonner";
import { problemOf } from "@/lib/http";

// Multi-facility picker: shown when login returns several facilities
// and no auto-selection, or none at all (staff waiting for an admin).
// The session payload carries facility IDs only, so the UI shows short
// IDs plus position. Facility names need either an extended session
// contract or a facility directory endpoint; neither exists yet.
//
// NOTE: split from the default export so useSearchParams() (inside
// useSelectFacility) sits under a Suspense boundary for prerendering.
function SelectFacilityForm() {
  const router = useRouter();
  const { data: session, isLoading } = useSession();
  const select = useSelectFacility();

  const choose = (facilityId: string) => {
    select.mutate(facilityId, {
      onError: (error) => toast.error(problemOf(error).message ?? "Could not switch facility"),
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading your facilities…</p>
        </CardContent>
      </Card>
    );
  }

  if (!session || session.facilities.length === 0) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm text-muted-foreground">
            No facility assigned — contact your administrator.
          </p>
          <Button onClick={() => router.replace("/login")}>Back to sign in</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Choose facility</CardTitle>
        <CardDescription>Your session will be scoped to the selected hospital.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {session.facilities.map((facilityId, index) => (
          <Button
            key={facilityId}
            variant="outline"
            className="justify-start"
            disabled={select.isPending}
            onClick={() => choose(facilityId)}
          >
            Facility {index + 1} · {facilityId.slice(0, 8)}…
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

export default function SelectFacilityPage() {
  return (
    <Suspense>
      <SelectFacilityForm />
    </Suspense>
  );
}
