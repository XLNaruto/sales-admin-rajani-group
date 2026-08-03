import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  UserCog,
  Network,
  Building2,
  MapPinned,
  Route,
  Store,
  ClipboardCheck,
  CalendarRange,
  Map,
} from "lucide-react";

export interface NavItem {
  label: string;
  /** Omit for parent items that only expand a submenu. */
  to?: string;
  icon: LucideIcon;
  children?: NavItem[];
  /** Match the active highlight only on an exact path (use when a sibling route extends this one). */
  exact?: boolean;
  /** Permission key gating this item; when set, hide it unless the user holds it. */
  permission?: string;
}

export interface NavGroup {
  /** Section heading — hidden when the rail is collapsed. */
  title: string;
  items: NavItem[];
}

/** Sidebar navigation: section labels → main menu → optional submenu. */
export const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Sales Incharge",
    items: [
      {
        label: "Sales Incharge",
        to: "/sales-incharge",
        icon: UserCog,
        permission: "sales-incharge:list",
      },
      {
        label: "Hierarchy",
        to: "/sales-incharge/hierarchy",
        icon: Network,
        permission: "hierarchy:list",
      },
      {
        label: "Beat Allocation",
        to: "/sales-incharge/beat-allocation",
        icon: Route,
        permission: "beat:allocate",
      },
    ],
  },
  {
    title: "Network",
    items: [
      {
        label: "Distributor Management",
        to: "/distributors",
        icon: Building2,
        permission: "distributor-master:list",
      },
      {
        label: "Retailer Management",
        to: "/retailers",
        icon: Store,
        permission: "retailer-master:list",
      },
    ],
  },
  {
    title: "Beat Foundation",
    items: [
      {
        label: "Beat Creation",
        to: "/beats",
        icon: MapPinned,
        permission: "beat:list",
      },
    ],
  },
  {
    title: "Journey Management",
    items: [
      {
        label: "Approval Queue",
        to: "/journey/approvals",
        icon: ClipboardCheck,
        permission: "journey-plan:list",
      },
      {
        label: "Journey Plan",
        to: "/journey/plan",
        icon: CalendarRange,
        permission: "journey-plan:read",
      },
      {
        label: "Live Map",
        to: "/journey/live-map",
        icon: Map,
        permission: "live-day:read",
      },
    ],
  },
];

/** Page names for routes that don't appear in the sidebar (auth, errors, etc.). */
const extraTitles: Record<string, string> = {
  // Opened from a day card on the Live Map, so it has no sidebar item of its own.
  "/journey/live-day": "Day Trail",
  "/profile": "My Profile",
  "/login": "Login",
  "/verify-otp": "Verify OTP",
  "/forgot-password": "Forgot Password",
  "/reset-password": "Reset Password",
};

/** Flattened nav items (parents + children) that have a `to`, longest path first. */
const routableNavItems = navGroups
  .flatMap((group) => group.items)
  .flatMap((item) => [item, ...(item.children ?? [])])
  .filter((item): item is NavItem & { to: string } => Boolean(item.to))
  .sort((a, b) => b.to.length - a.to.length);

/**
 * Landing page for a section that has no index route of its own.
 *
 * `/journey` is only a path prefix — nothing is mounted on it — so the breadcrumb's
 * middle crumb has to point at the section's main screen instead of 404-ing.
 */
const sectionLanding: Record<string, string> = {
  "/journey": "/journey/plan",
};

/**
 * Where a breadcrumb crumb for `pathname` should link, or undefined when that path
 * isn't navigable — those crumbs render as plain text rather than dead links.
 */
export function crumbTarget(pathname: string): string | undefined {
  if (sectionLanding[pathname]) return sectionLanding[pathname];
  if (routableNavItems.some((item) => item.to === pathname)) return pathname;
  return extraTitles[pathname] ? pathname : undefined;
}

/** Human-readable page name for a pathname, or undefined if unknown. */
export function pageNameForPath(pathname: string): string | undefined {
  const navMatch =
    routableNavItems.find((item) => item.to === pathname) ??
    routableNavItems.find(
      (item) => item.to !== "/" && pathname.startsWith(item.to),
    );
  return navMatch?.label ?? extraTitles[pathname];
}
