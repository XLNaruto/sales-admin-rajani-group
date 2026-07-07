import { useEffect } from 'react'
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { pageNameForPath } from '@/config/navigation'

const APP_NAME = 'Sales Admin'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  // Use the *resolved* location, not the pending one. During a navigation the
  // pending `location.pathname` flips to the target immediately while <Outlet/>
  // still renders the previous (resolved) route — keying off the resolved
  // location keeps the tab title in sync with what's actually on screen.
  const pathname = useRouterState({
    select: (s) => s.resolvedLocation?.pathname ?? s.location.pathname,
  })

  // Reflect the active page in the browser tab: "Sales Admin | <page>".
  useEffect(() => {
    const pageName = pageNameForPath(pathname)
    document.title = pageName ? `${APP_NAME} | ${pageName}` : APP_NAME
  }, [pathname])

  return <Outlet />
}
