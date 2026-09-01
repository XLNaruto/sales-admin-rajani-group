import { createFileRoute } from '@tanstack/react-router'
import { RepTrailPage, LOCATION_TRACKING_PERMISSION } from '@/features/location-tracking'
import { validateDataSearch } from '@/lib/route-search'
import { requirePermission } from '@/features/permissions'

/**
 * One rep's recorded day, opened from a row on `/tracking/live` (which passes
 * the day it was showing) or from the rep's own record. `?data=` carries
 * `{ id, date }`; with no token the screen opens today for whoever the rep
 * dropdown loads first.
 *
 * The same `sales-incharge-location:read` code as the fleet map — one grant
 * covers both screens.
 */
export const Route = createFileRoute('/_authenticated/tracking/trail')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, LOCATION_TRACKING_PERMISSION),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <RepTrailPage data={data} />
}
