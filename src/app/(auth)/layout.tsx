import type { ReactNode } from "react";

// Auth shell: centered card on a quiet background. No nav, no session
// requirements — every route under (auth) must render logged-out
// (login, MFA step, invites, resets, facility picker).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">HMS</h1>
        <p className="text-sm text-muted-foreground">Ghana Hospital Management System</p>
      </div>
      {children}
    </main>
  );
}
