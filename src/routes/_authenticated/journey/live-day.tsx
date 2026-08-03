import { createFileRoute } from '@tanstack/react-router'
import { LiveDayPage } from '@/features/journey-management'
import { validateDataSearch } from '@/lib/route-search'
import { requirePermission } from '@/features/permissions'

/**
 * One day's field trail, opened from a day card on `/journey/live-map`. `?data=`
 * carries `{ id, date }`; with no token the screen opens today for whoever the
 * incharge dropdown loads first.
 *
 * Kept a sibling of `live-map` rather than a child route: the two screens share
 * no layout chrome, and nesting would turn `live-map` into an outlet-only route.
 *
 * Gated on `live-day:read` — the whole screen is one read, with nothing to edit.
 */
export const Route = createFileRoute('/_authenticated/journey/live-day')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, 'live-day:read'),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <LiveDayPage data={data} />
}
