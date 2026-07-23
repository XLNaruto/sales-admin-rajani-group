import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  UserCog,
  Network,
  Building2,
  MapPinned,
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
    title: "Sales Network",
    items: [
      {
        label: "Sales Incharge",
        to: "/sales-incharge",
        icon: UserCog,
        permission: "sales-incharge:list",
      },
      {
        label: "Sales Incharge Hierarchy",
        to: "/sales-incharge-hierarchy",
        icon: Network,
        permission: "hierarchy:list",
      },
      {
        label: "Distributor Management",
        to: "/distributors",
        icon: Building2,
        permission: "distributor-master:list",
      },
    ],
  },
  {
    title: 'Beat Foundation',
    items: [{ label: 'Beat Creation', to: '/beats', icon: MapPinned }],
  },
];

/** Page names for routes that don't appear in the sidebar (auth, errors, etc.). */
const extraTitles: Record<string, string> = {
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

/** Human-readable page name for a pathname, or undefined if unknown. */
export function pageNameForPath(pathname: string): string | undefined {
  const navMatch =
    routableNavItems.find((item) => item.to === pathname) ??
    routableNavItems.find(
      (item) => item.to !== "/" && pathname.startsWith(item.to),
    );
  return navMatch?.label ?? extraTitles[pathname];
}
