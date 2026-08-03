import { createFileRoute } from '@tanstack/react-router'
import { LiveMapPage } from '@/features/journey-management'
import { validateDataSearch } from '@/lib/route-search'
import { requirePermission } from '@/features/permissions'

/**
 * `?data=` carries `{ id, month }` for the incharge and month being watched. With no
 * token the screen watches whoever the incharge dropdown loads first, for the current
 * month (the summaries endpoint caps a range at 31 days, so the window is a month).
 *
 * Gated on `live-day:read` — the whole screen is one read, with nothing to edit.
 */
export const Route = createFileRoute('/_authenticated/journey/live-map')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, 'live-day:read'),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <LiveMapPage data={data} />
}
