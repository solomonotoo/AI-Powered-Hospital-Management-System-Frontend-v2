"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIdleTimeout } from "@/lib/use-idle-timeout";
import { login } from "@/features/identity/api/auth";
import { useSession } from "@/features/identity/hooks/use-session";
import { problemOf } from "@/lib/http";

// Shared-workstation lock: after idle timeout, blur the screen behind
// a password gate instead of logging out (wards share PCs; clinicians
// step away mid-chart). Unlock re-authenticates silently via login —
// success resumes exactly where they left off, failure counts toward
// lockout like any bad password.
//
// Mount inside authenticated layouts (Slice 3 shell); NOT on auth
// pages. `timeoutMs` resolves per facility when settings land.
export function IdleLock({ timeoutMs }: { timeoutMs?: number }) {
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
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await login(session.username, password);
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
            {session ? `${session.username} — enter password to resume.` : "Enter password to resume."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lock-password">Password</Label>
            <Input
              id="lock-password"
              type="password"
              autoComplete="current-password"
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
        </CardContent>
      </Card>
    </div>
  );
}
