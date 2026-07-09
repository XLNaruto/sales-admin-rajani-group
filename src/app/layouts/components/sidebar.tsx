import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, PanelLeft, PanelLeftClose, X } from 'lucide-react'
import { navGroups, type NavItem } from '@/config/navigation'
import { useUiStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import { asset } from '@/lib/asset'

function isActivePath(to: string | undefined, pathname: string) {
  if (!to) return false
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}

/** Tracks a CSS media query in React state. */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export function Sidebar() {
  const isDesktop = useMediaQuery('(min-width: 1024px)') // Tailwind lg
  const collapsedRaw = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const mobileOpen = useUiStore((s) => s.sidebarMobileOpen)
  const setMobileSidebar = useUiStore((s) => s.setMobileSidebar)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Rail-collapse only applies on desktop; the mobile drawer is always full width.
  const collapsed = isDesktop && collapsedRaw
  const closeMobile = () => setMobileSidebar(false)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileSidebar(false)
  }, [pathname, setMobileSidebar])

  return (
    <>
      {/* Backdrop (mobile/tablet only) */}
      <div
        aria-hidden={!mobileOpen}
        onClick={closeMobile}
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        className={cn(
          'z-50 flex h-screen flex-col overflow-hidden border-sidebar-border bg-sidebar text-sidebar-foreground lg:border-r',
          'transition-[translate,width] duration-300 ease-in-out will-change-[translate,width]',
          // Mobile/tablet: fixed drawer sliding from the left.
          'fixed inset-y-0 left-0 w-72 shadow-xl',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: in-flow rail with collapse.
          'lg:relative lg:translate-x-0 lg:shadow-none',
          collapsed ? 'lg:w-16' : 'lg:w-72',
        )}
      >
        {/* Brand + controls */}
        <div
          className={cn(
            'flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          {!collapsed && (
            <img
              src={asset("media/logos/sidebar-logo.png")}
              alt="Rajani Group"
              className="mx-auto h-12 w-auto shrink-0 object-contain"
            />
          )}
          {/* Desktop collapse toggle */}
          <button
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:grid"
          >
            {collapsed ? (
              <PanelLeft className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
          </button>
          {/* Mobile close button */}
          <button
            onClick={closeMobile}
            title="Close menu"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        {/* Navigation: section labels → main menu → submenu */}
        <nav className="sidebar-scroll flex-1 space-y-4 overflow-y-auto px-2 py-2">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <p
                className={cn(
                  'px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40',
                  collapsed && 'hidden',
                )}
              >
                {group.title}
              </p>
              {group.items.map((item) =>
                item.children?.length ? (
                  <NavParent
                    key={item.label}
                    item={item}
                    collapsed={collapsed}
                    pathname={pathname}
                    onNavigate={closeMobile}
                  />
                ) : (
                  <NavLeaf
                    key={item.to}
                    item={item}
                    collapsed={collapsed}
                    onNavigate={closeMobile}
                  />
                ),
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}

const leafClasses = (collapsed: boolean) =>
  cn(
    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    collapsed && 'justify-center px-0',
    'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    // Selected: soft navy highlight + white bold text; orange accent on the icon.
    '[&.active]:bg-[#24365a] [&.active]:font-semibold [&.active]:text-white dark:[&.active]:bg-accent',
  )

function NavLeaf({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  if (!item.to) return null
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact ?? item.to === '/' }}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={leafClasses(collapsed)}
    >
      <Icon className="size-[18px] shrink-0 transition-colors group-[.active]:text-sidebar-primary" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

function NavParent({
  item,
  collapsed,
  pathname,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  pathname: string
  onNavigate?: () => void
}) {
  const children = item.children ?? []
  const childActive = children.some((c) => isActivePath(c.to, pathname))
  const [open, setOpen] = useState(childActive)
  const Icon = item.icon

  // Auto-open when a child becomes the active route.
  useEffect(() => {
    if (childActive) setOpen(true)
  }, [childActive])

  // Collapsed rail: flatten to icon-only child links.
  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {children.map((c) => (
          <NavLeaf key={c.to} item={c} collapsed onNavigate={onNavigate} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          childActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/75',
        )}
      >
        <Icon className="size-[18px] shrink-0" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <ul className="mt-0.5 ml-4 space-y-0.5 border-l border-sidebar-border pl-3">
          {children.map((c) => (
            <li key={c.to}>
              <NavLeaf item={c} collapsed={false} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
