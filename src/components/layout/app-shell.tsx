"use client";

import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IdleLock } from "@/components/shared/idle-lock";
import { AppNavbar } from "@/components/layout/app-navbar";
import { AppSidebar } from "@/components/layout/app-sidebar";

/**
 * Authenticated facility shell: permission-filtered sidebar, top bar,
 * page area, and the shared-workstation idle lock. Mounted only inside
 * the facility route group, never on auth pages.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppNavbar />
          <div className="flex-1 p-4 md:p-6">{children}</div>
        </SidebarInset>
        <IdleLock />
      </SidebarProvider>
    </TooltipProvider>
  );
}
