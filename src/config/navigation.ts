import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  UserCog,
  Network,
  Building2,
  // Icons below are used by the temporarily-hidden nav groups — keep for restore.
  // UserPlus,
  // Store,
  // Network,
  // Briefcase,
  // Navigation,
  // Users,
  // CheckSquare,
  // Wallet,
  // BarChart3,
  // MessageSquare,
  // Bell,
} from 'lucide-react'

export interface NavItem {
  label: string
  /** Omit for parent items that only expand a submenu. */
  to?: string
  icon: LucideIcon
  children?: NavItem[]
  /** Match the active highlight only on an exact path (use when a sibling route extends this one). */
  exact?: boolean
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
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Sales Incharge', to: '/sales-incharge', icon: UserCog },
      { label: 'Sales Incharge Hierarchy', to: '/sales-incharge-hierarchy', icon: Network },
    ],
  },
  // {
  //   title: 'Beat Foundation',
  //   items: [{ label: 'Beat Creation', to: '/beats', icon: MapPinned }],
  // },
  {
    title: 'Sales Network',
    items: [{ label: 'Distributor Management', to: '/distributors', icon: Building2 }],
  },
  // Temporarily hidden — restore the groups below to re-enable the rest of the nav.
  // {
  //   title: 'Sales Network',
  //   items: [
  //     { label: 'Retailers', to: '/retailers', icon: Store },
  //     { label: 'Team', to: '/team', icon: Network },
  //   ],
  // },
  // {
  //   title: 'Field Operations',
  //   items: [
  //     { label: 'Beat & Tour', to: '/beat-tour', icon: MapPinned },
  //     { label: 'CRM & Sales', to: '/crm', icon: Briefcase },
  //     { label: 'GPS Tracking', to: '/gps', icon: Navigation },
  //   ],
  // },
  // {
  //   title: 'Workforce',
  //   items: [
  //     { label: 'Employees', to: '/employees', icon: Users },
  //     { label: 'Approvals', to: '/approvals', icon: CheckSquare },
  //     { label: 'Expense TA/DA', to: '/expense-tada', icon: Wallet },
  //   ],
  // },
  // {
  //   title: 'Insights',
  //   items: [
  //     { label: 'Reports', to: '/reports', icon: BarChart3 },
  //     { label: 'Communication', to: '/communication', icon: MessageSquare },
  //     { label: 'Notifications', to: '/notifications', icon: Bell },
  //   ],
  // },
]

/** Page names for routes that don't appear in the sidebar (auth, errors, etc.). */
const extraTitles: Record<string, string> = {
  '/profile': 'My Profile',
  '/login': 'Login',
  '/verify-otp': 'Verify OTP',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
}

/** Flattened nav items (parents + children) that have a `to`, longest path first. */
const routableNavItems = navGroups
  .flatMap((group) => group.items)
  .flatMap((item) => [item, ...(item.children ?? [])])
  .filter((item): item is NavItem & { to: string } => Boolean(item.to))
  .sort((a, b) => b.to.length - a.to.length)

/** Human-readable page name for a pathname, or undefined if unknown. */
export function pageNameForPath(pathname: string): string | undefined {
  const navMatch =
    routableNavItems.find((item) => item.to === pathname) ??
    routableNavItems.find((item) => item.to !== '/' && pathname.startsWith(item.to))
  return navMatch?.label ?? extraTitles[pathname]
}
