import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { NotFound, RouteError } from '@/features/error'
import { queryClient } from '@/lib/query-client'

export const router = createRouter({
  routeTree,
  // Keep routing in sync with the Vite `base` (VITE_APP_BASE_URL) so the app
  // works when served under a subpath like /rajanigroup/sales-panel/.
  basepath: import.meta.env.BASE_URL,
  // Preload the matched route (component + loader) on link hover/intent.
  defaultPreload: 'intent',
  // Let TanStack Query own cache freshness: 0 means the router won't treat a
  // preloaded loader result as fresh, so `ensureQueryData` in a loader defers
  // to the query's own staleTime instead of being double-cached.
  defaultPreloadStaleTime: 0,
  // Shared with every route's `loader`/`beforeLoad` so they can prefetch data.
  context: { queryClient },
  scrollRestoration: true,
  // Any unmatched path renders the themed 404 screen.
  defaultNotFoundComponent: () => <NotFound />,
  // Any error thrown from a route `loader`/`beforeLoad` renders the themed error
  // screen — a 403 shows the dedicated "Access denied" page, everything else a
  // generic retry screen. Renders inside the dashboard shell for in-app routes.
  defaultErrorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
