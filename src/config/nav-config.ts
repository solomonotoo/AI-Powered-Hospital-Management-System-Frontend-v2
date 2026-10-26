import {
  Building2,
  ClipboardCheck,
  Hash,
  LayoutDashboard,
  Network,
  Printer,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

// Navigation catalogue for the authenticated facility shell.
//
// WHY a config file (blueprint §47): permission gating belongs in one
// place, not scattered through JSX. `permissions` is an ANY-OF list;
// omit it for entries every signed-in user may see.
//
// Only routes that actually exist belong here. Modules land with their
// phase; a dead link is worse than a missing one.

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  permissions?: string[];
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

/**
 * Navigation visibility rule. An item with no permission list is public
 * inside the tier; otherwise the session must hold at least one listed
 * permission. The backend still authorizes the route itself.
 */
export function isNavItemAllowed(
  item: NavItem,
  permissions: readonly string[] | null | undefined,
): boolean {
  if (!item.permissions || item.permissions.length === 0) return true;
  if (!permissions) return false;
  return item.permissions.some((permission) => permissions.includes(permission));
}

export const facilityNav: NavSection[] = [
  {
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Facility",
    items: [
      {
        title: "Setup & go-live",
        url: "/admin/setup",
        icon: ClipboardCheck,
        permissions: ["FACILITY_UPDATE"],
      },
      {
        title: "Facility profile",
        url: "/admin/facility",
        icon: Building2,
        permissions: ["FACILITY_UPDATE"],
      },
      {
        title: "Organization units",
        url: "/admin/units",
        icon: Network,
        permissions: ["FACILITY_UNIT_MANAGE"],
      },
      {
        title: "Number sequences",
        url: "/admin/setup/sequences",
        icon: Hash,
        permissions: ["CONFIG_READ"],
      },
      {
        title: "Print profile",
        url: "/admin/setup/print-profile",
        icon: Printer,
        permissions: ["CONFIG_READ"],
      },
    ],
  },
  {
    label: "Account",
    items: [{ title: "Security", url: "/account/security", icon: ShieldCheck }],
  },
];

// Platform tier navigation. Only registry/administrative routes belong
// here: a platform account must never see clinical or billing entries.
export const platformNav: NavSection[] = [
  {
    items: [{ title: "Overview", url: "/platform", icon: LayoutDashboard }],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Facilities",
        url: "/platform/facilities",
        icon: Building2,
        permissions: ["FACILITY_LIST_ALL"],
      },
    ],
  },
];
