import type { LucideIcon } from 'lucide-react'
import {
  // BarChart3,
  LayoutDashboard,
  UserCog,
  Building2,
  MapPinned,
  Route,
  Store,
  ClipboardCheck,
  CalendarRange,
  Map,
  Tags,
  HandCoins,
  Repeat2,
  UserPen,
} from 'lucide-react'

export interface NavItem {
  label: string
  /** Omit for parent items that only expand a submenu. */
  to?: string
  icon: LucideIcon
  children?: NavItem[]
  /** Match the active highlight only on an exact path (use when a sibling route extends this one). */
  exact?: boolean
  /** Permission key gating this item; when set, hide it unless the user holds it. */
  permission?: string
}

export interface NavGroup {
  /** Section heading — hidden when the rail is collapsed. */
  title: string
  items: NavItem[]
}

/** Sidebar navigation: section labels → main menu → optional submenu. */
export const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Sales Incharge',
    items: [
      {
        label: 'Sales Incharge',
        to: '/sales-incharge',
        icon: UserCog,
        permission: 'sales-incharge:list',
      },
      // {
      //   label: 'Hierarchy',
      //   to: '/sales-incharge/hierarchy',
      //   icon: Network,
      //   permission: 'hierarchy:list',
      // },
      {
        label: 'Beat Allocation',
        to: '/sales-incharge/beat-allocation',
        icon: Route,
        permission: 'beat:allocate',
      },
    ],
  },
  {
    title: 'Network',
    items: [
      {
        label: 'Distributor Management',
        to: '/distributors',
        icon: Building2,
        permission: 'distributor-master:list',
      },
      {
        label: 'Retailer Management',
        to: '/retailers',
        icon: Store,
        permission: 'retailer-master:list',
        // `/retailers/analytics` is its own item below, so the list link must
        // not stay highlighted while the analytics screen is open.
        exact: true,
      },
      // {
      //   label: 'Retailer Analytics',
      //   to: '/retailers/analytics',
      //   icon: BarChart3,
      //   permission: 'retailer-master:list',
      // },
    ],
  },
  {
    title: 'Beat Foundation',
    items: [
      {
        label: 'Beat Creation',
        to: '/beats',
        icon: MapPinned,
        permission: 'beat:list',
      },
    ],
  },
  {
    title: 'Journey Management',
    items: [
      {
        label: 'Monthly Plans',
        to: '/journey/plans',
        icon: ClipboardCheck,
        permission: 'journey-plan:list',
      },
      {
        label: 'Plan Detail',
        to: '/journey/plan',
        icon: CalendarRange,
        permission: 'journey-plan:read',
      },
      {
        label: 'Live Map',
        to: '/journey/live-map',
        icon: Map,
        permission: 'live-day:read',
      },
    ],
  },
  {
    title: 'Field Requests',
    items: [
      {
        label: 'Beat Changes',
        to: '/requests/beat-changes',
        icon: Repeat2,
        permission: 'beat-change:list',
      },
      {
        label: 'Profile Edit Requests',
        to: '/requests/profile-edits',
        icon: UserPen,
        permission: 'profile-edit-request:list',
      },
    ],
  },
  {
    title: 'Master Management',
    items: [
      {
        label: 'Outlet Types',
        to: '/masters/outlet-types',
        icon: Tags,
      },
      {
        label: 'Payment Conditions',
        to: '/masters/payment-conditions',
        icon: HandCoins,
      },
    ],
  },
]

/** Page names for routes that don't appear in the sidebar (auth, errors, etc.). */
const extraTitles: Record<string, string> = {
  // Opened from a day card on the Live Map, so it has no sidebar item of its own.
  '/journey/live-day': 'Day Trail',
  '/profile': 'My Profile',
  '/login': 'Login',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
}

/** Flattened nav items (parents + children) that have a `to`, longest path first. */
const routableNavItems = navGroups
  .flatMap((group) => group.items)
  .flatMap((item) => [item, ...(item.children ?? [])])
  .filter((item): item is NavItem & { to: string } => Boolean(item.to))
  .sort((a, b) => b.to.length - a.to.length)

/**
 * Landing page for a section that has no index route of its own.
 *
 * A prefix-only path (nothing mounted on it) would 404, so it either points at the
 * section's main screen or is left out here to render as a disabled crumb.
 * `/journey` is intentionally absent: its crumb stays plain text.
 */
const sectionLanding: Record<string, string> = {}

/**
 * Where a breadcrumb crumb for `pathname` should link, or undefined when that path
 * isn't navigable — those crumbs render as plain text rather than dead links.
 */
export function crumbTarget(pathname: string): string | undefined {
  if (sectionLanding[pathname]) return sectionLanding[pathname]
  if (routableNavItems.some((item) => item.to === pathname)) return pathname
  return extraTitles[pathname] ? pathname : undefined
}

/**
 * Label for the breadcrumb crumb at `pathname`, or undefined to fall back to
 * title-casing the URL segment.
 *
 * Exact matches only — unlike `pageNameForPath` there is no prefix fallback, so a
 * detail route's id segment keeps its own crumb instead of inheriting the list
 * screen's name. This is what keeps a crumb reading as the screen is named rather
 * than as its path spells it.
 */
export function crumbLabel(pathname: string): string | undefined {
  return (
    routableNavItems.find((item) => item.to === pathname)?.label ?? extraTitles[pathname]
  )
}

/** Human-readable page name for a pathname, or undefined if unknown. */
export function pageNameForPath(pathname: string): string | undefined {
  const navMatch =
    routableNavItems.find((item) => item.to === pathname) ??
    routableNavItems.find((item) => item.to !== '/' && pathname.startsWith(item.to))
  return navMatch?.label ?? extraTitles[pathname]
}
