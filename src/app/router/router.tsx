import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { NotFound } from '@/components/common/not-found'

export const router = createRouter({
  routeTree,
  // Keep routing in sync with the Vite `base` (VITE_APP_BASE_URL) so the app
  // works when served under a subpath like /rajanigroup/sales-panel/.
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  scrollRestoration: true,
  // Any unmatched path renders the themed 404 screen.
  defaultNotFoundComponent: () => <NotFound />,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
