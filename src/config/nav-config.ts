import {
  Building2,
  LayoutDashboard,
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

export const facilityNav: NavSection[] = [
  {
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
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
