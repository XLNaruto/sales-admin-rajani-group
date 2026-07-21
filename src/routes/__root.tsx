import { useEffect } from 'react'
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { pageNameForPath } from '@/config/navigation'
import { OfflineScreen } from '@/features/error'
import { useOnlineStatus } from '@/hooks/use-online-status'

const APP_NAME = 'Sales Admin'

/**
 * Router context available to every route. The `queryClient` lets route
 * `loader`s prefetch data into the TanStack Query cache — combined with the
 * router's `defaultPreload: 'intent'`, hovering a link warms both the route
 * component and its data before the user clicks.
 */
export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
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
  const online = useOnlineStatus()

  // Reflect the active page in the browser tab: "Sales Admin | <page>".
  useEffect(() => {
    const pageName = pageNameForPath(pathname)
    document.title = pageName ? `${APP_NAME} | ${pageName}` : APP_NAME
  }, [pathname])

  return (
    <>
      <Outlet />
      {!online && <OfflineScreen />}
    </>
  )
}
