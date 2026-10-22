"use client";

import { Building2, ChevronDown, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLogout, useSwitchFacility } from "@/features/identity/hooks/use-auth";
import { useSession } from "@/features/identity/hooks/use-session";

function facilityLabel(facilityId: string | null, facilities: string[]): string {
  if (!facilityId) return "No facility selected";
  const index = facilities.indexOf(facilityId);
  const position = index >= 0 ? `Facility ${index + 1}` : "Facility";
  return `${position} · ${facilityId.slice(0, 8)}…`;
}

export function AppNavbar() {
  const { data: session } = useSession();
  const switchFacility = useSwitchFacility();
  const logout = useLogout();

  return (
    <nav className="sticky top-0 z-10 flex h-14 w-full shrink-0 items-center justify-between border-b bg-background px-3 md:px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
        <span className="text-sm font-medium">Facility workspace</span>
      </div>

      <div className="flex items-center gap-2">
        {session && session.facilities.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Building2 />
                <span className="hidden max-w-44 truncate sm:inline">
                  {facilityLabel(session.facilityId, session.facilities)}
                </span>
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Switch facility</DropdownMenuLabel>
              {session.facilities.map((facilityId) => (
                <DropdownMenuItem
                  key={facilityId}
                  disabled={facilityId === session.facilityId || switchFacility.isPending}
                  onClick={() => switchFacility.mutate(facilityId)}
                >
                  <Building2 />
                  <span className="truncate font-mono text-xs">
                    {facilityId.slice(0, 8)}…
                  </span>
                  {facilityId === session.facilityId && (
                    <span className="ml-auto text-xs text-muted-foreground">current</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          session && (
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
              <Building2 className="size-3.5" />
              {facilityLabel(session.facilityId, session.facilities)}
            </span>
          )
        )}

        {session && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <UserRound />
                <span className="hidden max-w-40 truncate sm:inline">{session.username}</span>
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate">{session.username}</span>
                <span className="block font-normal text-muted-foreground">
                  {session.accountType === "PLATFORM" ? "Platform account" : "Staff account"}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
              >
                <LogOut />
                {logout.isPending ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
