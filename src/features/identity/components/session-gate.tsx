"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession, useSessionBootstrap } from "@/features/identity/hooks/use-session";

// Client-side session gate for authenticated route groups.
//
// WHY client-side: the refresh cookie is HttpOnly, scoped to the
// backend origin and path (/api/v1/auth), so Next middleware on the
// frontend origin cannot see it. This gate is therefore a UX guard,
// not a security boundary — every backend request is authorized again
// server-side.
//
// It waits for bootstrap, loads /identity/me, and routes by RESPONSE
// SHAPE: no session → login; forced password change → reset; platform
// account in the facility tier (or vice versa) → its own console.

export function SessionGate({
  tier,
  children,
}: {
  tier: "FACILITY" | "PLATFORM";
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const ready = useSessionBootstrap();
  const { data: session, isLoading } = useSession();

  useEffect(() => {
    if (!ready || isLoading) return;

    if (!session) {
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (session.mustChangePassword) {
      router.replace("/reset-password?forced=1");
      return;
    }
    if (tier === "FACILITY" && session.accountType === "PLATFORM") {
      router.replace("/platform");
      return;
    }
    if (tier === "PLATFORM" && session.accountType !== "PLATFORM") {
      router.replace("/dashboard");
    }
  }, [ready, isLoading, session, tier, pathname, router]);

  if (!ready || isLoading) {
    return <SessionSplash label="Restoring your session…" />;
  }

  if (!session) {
    return <SessionSplash label="Redirecting to sign in…" />;
  }

  if (session.mustChangePassword) {
    return <SessionSplash label="Password change required…" />;
  }

  if (tier === "FACILITY" && session.accountType === "PLATFORM") {
    return <SessionSplash label="Redirecting to the platform console…" />;
  }

  if (tier === "PLATFORM" && session.accountType !== "PLATFORM") {
    return <SessionSplash label="Redirecting to your facility…" />;
  }

  return <>{children}</>;
}

function SessionSplash({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/40">
      <div
        aria-hidden
        className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
      />
      <p className="text-sm text-muted-foreground" role="status">
        {label}
      </p>
    </main>
  );
}
