import type { ReactNode } from "react";
import { SessionGate } from "@/features/identity/components/session-gate";

// Facility tier: every route below requires a staff session with a
// selected facility. Platform accounts are redirected to their own
// console by the gate.
export default function FacilityLayout({ children }: { children: ReactNode }) {
  return <SessionGate tier="FACILITY">{children}</SessionGate>;
}
