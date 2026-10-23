"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { IdleLock } from "@/components/shared/idle-lock";
import { Button } from "@/components/ui/button";
import { platformNav, type NavItem } from "@/config/nav-config";
import { useLogout } from "@/features/identity/hooks/use-auth";
import { useSession } from "@/features/identity/hooks/use-session";

/**
 * Platform console shell: registry navigation only, no facility
 * sidebar. Shares the idle lock because platform workstations are
 * shared too; a platform account is still a privileged session.
 */
export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const logout = useLogout();

  const allowed = (item: NavItem): boolean => {
    if (!item.permissions || item.permissions.length === 0) return true;
    if (!session) return false;
    return item.permissions.some((permission) =>
      session.permissions.includes(permission),
    );
  };

  const items = platformNav.flatMap((section) => section.items).filter(allowed);

  const isActive = (url: string): boolean => {
    if (url === "/platform") return pathname === "/platform";
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/platform" className="flex shrink-0 items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck aria-hidden="true" className="size-4" />
            </div>
            <span className="text-sm font-semibold">HMS Platform</span>
          </Link>

          <nav aria-label="Platform" className="flex flex-1 items-center gap-1 overflow-x-auto">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.url);
              return (
                <Button
                  key={item.url}
                  asChild
                  size="sm"
                  variant={active ? "secondary" : "ghost"}
                >
                  <Link href={item.url} aria-current={active ? "page" : undefined}>
                    <Icon aria-hidden="true" />
                    {item.title}
                  </Link>
                </Button>
              );
            })}
          </nav>

          <span className="hidden max-w-40 truncate text-xs text-muted-foreground sm:block">
            {session?.username}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            <LogOut aria-hidden="true" />
            <span className="hidden sm:inline">
              {logout.isPending ? "Signing out…" : "Sign out"}
            </span>
            <span className="sr-only sm:hidden">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
      <IdleLock />
    </div>
  );
}
