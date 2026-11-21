/**
 * Daily Summary — one row per sales incharge for a single day: attendance,
 * first call, call counters, productivity, primary and secondary order value and
 * beats. Read-only; rows drill into the Journey Management day trail, and the
 * Action column opens the rep's Sales Details page (calls + orders + MTD).
 */
export { DailySummaryPage } from './pages/daily-summary-page'
export { SalesDetailsPage } from './pages/sales-details-page'

/* Query hook — the only way another feature may reach this endpoint. */
export { useDailySummaries, useDailySummarySalesDetails } from './api/use-daily-summary'

/* Permission codes: the screen's own, and the drill-down's. */
export { DAILY_SUMMARY_PERMISSION, LIVE_DAY_PERMISSION } from './lib/permission'

/* Pure helpers, safe to reuse anywhere. */
export {
  DAY_TYPE_LABEL,
  DAILY_SUMMARY_TABS,
  formatAmount,
  formatNetValue,
  formatQty,
  salesDetailsRowKind,
  timeIST,
  todayIST,
} from './lib/daily-summary-format'

export type { SalesDetailsRowKind } from './lib/daily-summary-format'

export type {
  DailySummary,
  DailySummaryCounters,
  DailySummaryDayType,
  DailySummaryParams,
  DailySummaryResult,
  DailySummarySortBy,
  DailySummaryTab,
  SalesDetails,
  SalesDetailsParams,
  SalesDetailsRow,
  SalesDetailsTotals,
} from './types'
