"use client";

import type { ReactNode } from "react";
import { useCan } from "@/features/identity/hooks/use-session";

// Permission gate for UI only (backend enforces for real).
// Usage: <Can permission="PATIENT_REGISTER"><Button/></Can>
// Renders nothing while the session loads (fail-closed UI).
export function Can({ permission, children }: { permission: string; children: ReactNode }) {
  const allowed = useCan(permission);
  if (!allowed) return null;
  return <>{children}</>;
}
