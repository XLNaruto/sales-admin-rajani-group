import { createFileRoute } from '@tanstack/react-router'
import { SalesDetailsPage } from '@/features/daily-summary'
import { validateDataSearch } from '@/lib/route-search'

/**
 * One rep's calls and sales on a day. `?data=` carries `{ id, date }` (plus the
 * rep's name and code, and the list's token for Back), keeping the id out of
 * the path per the app-wide rule for detail screens.
 */
export const Route = createFileRoute('/_authenticated/daily-summary/sales-details')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <SalesDetailsPage data={data} />
}
