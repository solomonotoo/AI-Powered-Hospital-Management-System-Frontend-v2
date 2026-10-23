import type { ReactNode } from "react";
import { PlatformShell } from "@/components/layout/platform-shell";

// Applies to /platform and every nested platform route. The tier gate
// in the parent (platform) layout has already rejected staff accounts.
export default function PlatformModuleLayout({ children }: { children: ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
