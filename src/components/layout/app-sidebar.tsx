"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hospital } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { facilityNav, isNavItemAllowed } from "@/config/nav-config";
import { useSession } from "@/features/identity/hooks/use-session";

/**
 * Facility navigation. Items are filtered by the permissions returned
 * from /identity/me; the backend still authorizes every request, so
 * hiding a link is convenience, never security.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const sections = facilityNav
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        isNavItemAllowed(item, session?.permissions),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Hospital className="size-5" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">HMS</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    Facility workspace
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section, index) => (
          <SidebarGroup key={section.label ?? `section-${index}`}>
            {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.url || pathname.startsWith(`${item.url}/`);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={item.url}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
