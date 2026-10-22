import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

// Routes that need the sidebar/nav shell. Account settings and the
// dashboard use it; future full-screen workflows (a wizard, a queue
// board) can live directly under (facility) without the chrome.
export default function WithNavLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
