import { Badge } from '@/components/ui/badge'
import { noReportLabel } from '../lib/daily-report-format'
import type { DailyReportKind } from '../types'

/**
 * A report's state in one badge: none filed, still running, or closed. The
 * evening only closes at check-out, so "In progress" is common late in the day.
 */
export function ReportStatusBadge({
  kind,
  hasReport,
  isClosed,
}: {
  kind: DailyReportKind
  hasReport: boolean
  isClosed: boolean
}) {
  if (!hasReport) {
    return (
      <Badge variant="secondary" className="whitespace-nowrap">
        {noReportLabel(kind)}
      </Badge>
    )
  }
  if (!isClosed) {
    return (
      <Badge variant="warning" className="whitespace-nowrap">
        In progress
      </Badge>
    )
  }
  return (
    <Badge variant="success" className="whitespace-nowrap">
      Closed
    </Badge>
  )
}
