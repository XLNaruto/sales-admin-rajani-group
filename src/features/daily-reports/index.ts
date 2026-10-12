/**
 * Daily Reports — every sales incharge's morning or evening field report for
 * one date, in the selected company, and one rep's report in full. Read-only;
 * every figure is computed by the backend.
 */
export { DailyReportsPage } from './pages/daily-reports-page'
export { DailyReportDetailPage } from './pages/daily-report-detail-page'

/* Query hooks — the only way another feature may reach these endpoints. */
export { useDailyReports, useRepDailyReport } from './api/use-daily-reports'

export { DAILY_REPORT_PERMISSION } from './lib/permission'

/* Pure helpers, safe to reuse anywhere. */
export { formatRupees, KIND_LABEL, NO_ORDER_REASON_LABEL } from './lib/daily-report-format'

export type {
  DailyReportCounters,
  DailyReportDivision,
  DailyReportKind,
  DailyReportMeasures,
  DailyReportRemark,
  DailyReportRow,
  DailyReportSummary,
  DailyReportsParams,
  DailyReportsResult,
  RepDailyReport,
} from './types'
