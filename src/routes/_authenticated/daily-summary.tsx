import { createFileRoute } from '@tanstack/react-router'
import { DailySummaryPage, DAILY_SUMMARY_PERMISSION } from '@/features/daily-summary'
import { validateDataSearch } from '@/lib/route-search'
import { requirePermission } from '@/features/permissions'

/**
 * `?data=` carries the whole filter set — `{ date, stateId, type, search, page,
 * pageSize, sortBy, sortOrder }` — so a refresh, a shared link or Back from a
 * day trail restores the same view. With no token the screen reads today.
 *
 * Gated on `daily-summary:read`, which is also the menu grant (there is no
 * `:list` code). Opening a row additionally needs `live-day:read`.
 */
export const Route = createFileRoute('/_authenticated/daily-summary')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, DAILY_SUMMARY_PERMISSION),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DailySummaryPage data={data} />
}
