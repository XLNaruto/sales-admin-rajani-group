/**
 * Daily Summary — one row per sales incharge for a single day: attendance,
 * first call, call counters, productivity, primary order value and beats.
 * Read-only; rows drill into the Journey Management day trail.
 */
export { DailySummaryPage } from './pages/daily-summary-page'

/* Query hook — the only way another feature may reach this endpoint. */
export { useDailySummaries } from './api/use-daily-summary'

/* Permission codes: the screen's own, and the drill-down's. */
export { DAILY_SUMMARY_PERMISSION, LIVE_DAY_PERMISSION } from './lib/permission'

/* Pure helpers, safe to reuse anywhere. */
export {
  DAY_TYPE_LABEL,
  DAILY_SUMMARY_TABS,
  formatNetValue,
  timeIST,
  todayIST,
} from './lib/daily-summary-format'

export type {
  DailySummary,
  DailySummaryCounters,
  DailySummaryDayType,
  DailySummaryParams,
  DailySummaryResult,
  DailySummarySortBy,
  DailySummaryTab,
} from './types'
