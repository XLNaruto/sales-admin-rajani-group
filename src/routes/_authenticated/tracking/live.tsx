import { createFileRoute } from '@tanstack/react-router'
import { FleetMapPage, LOCATION_TRACKING_PERMISSION } from '@/features/location-tracking'
import { validateDataSearch } from '@/lib/route-search'
import { requirePermission } from '@/features/permissions'

/**
 * `?data=` carries `{ date }` — the IST calendar day being read. With no token
 * the screen reads today.
 *
 * Gated on `sales-incharge-location:read`, which is this feature's menu grant as
 * well (there is no `:list` code). A user holding `live-day:read` does not
 * necessarily hold this one: the Journey Management Live Map is a different
 * feature answering a different question.
 */
export const Route = createFileRoute('/_authenticated/tracking/live')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, LOCATION_TRACKING_PERMISSION),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <FleetMapPage data={data} />
}
