import { createFileRoute } from '@tanstack/react-router'
import { DailySummaryPage } from '@/features/daily-summary'
import { validateDataSearch } from '@/lib/route-search'

/**
 * `?data=` carries the whole filter set — `{ date, stateId, type, search, page,
 * pageSize, sortBy, sortOrder }` — so a refresh, a shared link or Back from a
 * day trail or a rep's Sales Details restores the same view. With no token the
 * screen reads today.
 */
export const Route = createFileRoute('/_authenticated/daily-summary/')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DailySummaryPage data={data} />
}
