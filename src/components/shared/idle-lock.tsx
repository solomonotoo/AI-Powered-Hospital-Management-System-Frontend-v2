"use client";

import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIdleTimeout } from "@/lib/use-idle-timeout";
import { login, logout } from "@/features/identity/api/auth";
import { sessionQueryKey, useSession } from "@/features/identity/hooks/use-session";
import { setMfaToken } from "@/lib/auth-store";
import { problemOf } from "@/lib/http";

// Shared-workstation lock: after idle timeout, blur the screen behind
// a password gate instead of logging out (wards share PCs; clinicians
// step away mid-chart). Unlock re-authenticates via login — success
// resumes exactly where they left off, failure counts toward lockout
// like any bad password.
//
// MFA accounts are NOT resumed by the password alone: they are sent to
// the verification step and return here afterwards via returnUrl.
//
// Mount inside authenticated layouts (AppShell); NOT on auth pages.
export function IdleLock({ timeoutMs }: { timeoutMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: session } = useSession();

  useIdleTimeout(() => {
    if (session) setLocked(true);
  }, timeoutMs);

  if (!locked) return null;

  const unlock = async () => {
    if (!session || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await login(session.username, password);
      if (result.mfaRequired) {
        // Password accepted, but a second factor is still required.
        // The lock screen is replaced by the MFA step; verifying takes
        // the user back to this page.
        setMfaToken(result.mfaToken ?? null);
        setPassword("");
        setLocked(false);
        router.replace(`/mfa?returnUrl=${encodeURIComponent(pathname)}`);
        return;
      }
      // A fresh login may change facility or permissions (role edits
      // since the session started), so drop the cached session.
      queryClient.removeQueries({ queryKey: sessionQueryKey });
      setPassword("");
      setLocked(false);
    } catch (err) {
      setError(problemOf(err).message ?? "Could not unlock");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Session locked"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Session locked</CardTitle>
          <CardDescription>
            {session
              ? `${session.username} — enter password to resume.`
              : "Enter password to resume."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lock-password">Password</Label>
            <Input
              id="lock-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") unlock();
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button onClick={unlock} disabled={busy || password.length === 0}>
            {busy ? "Unlocking…" : "Unlock"}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              void (async () => {
                await logout();
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.assign("/login");
              })();
            }}
          >
            Sign out instead
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
