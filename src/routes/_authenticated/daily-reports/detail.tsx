import { createFileRoute } from '@tanstack/react-router'
import { DailyReportDetailPage } from '@/features/daily-reports'
import { validateDataSearch } from '@/lib/route-search'

/**
 * One rep's morning or evening report. `?data=` carries `{ id, kind, date }`
 * (plus the rep's name and code, and the list's token for Back), keeping the
 * id out of the path per the app-wide rule for detail screens.
 */
export const Route = createFileRoute('/_authenticated/daily-reports/detail')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DailyReportDetailPage data={data} />
}
