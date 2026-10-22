import type { ReactNode } from "react";
import { SessionGate } from "@/features/identity/components/session-gate";

// Platform tier: no facility context, no clinical navigation. The gate
// sends staff accounts back to their facility workspace.
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <SessionGate tier="PLATFORM">{children}</SessionGate>;
}
