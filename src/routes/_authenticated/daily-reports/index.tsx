import { createFileRoute } from '@tanstack/react-router'
import { DailyReportsPage } from '@/features/daily-reports'
import { validateDataSearch } from '@/lib/route-search'

/**
 * `?data=` carries the whole filter set — `{ kind, date, status, search, page,
 * pageSize }` — so a refresh, a shared link or Back from a rep's report
 * restores the same view. With no token the screen reads today's evening.
 */
export const Route = createFileRoute('/_authenticated/daily-reports/')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DailyReportsPage data={data} />
}
