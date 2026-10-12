/** Query hooks for the Daily Reports reads. */
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDailyReports, fetchRepDailyReport } from './daily-reports-api'
import type { DailyReportKind, DailyReportsParams } from '../types'

/**
 * GET /daily-reports — one page of rows. Keeps the previous page on screen while
 * a filter or page change is in flight, so the table doesn't blank. A company
 * switch invalidates every query, which refetches this one.
 */
export function useDailyReports(params: DailyReportsParams) {
  return useQuery({
    queryKey: queryKeys.dailyReports.list(params as unknown as Record<string, unknown>),
    queryFn: () => fetchDailyReports(params),
    placeholderData: keepPreviousData,
  })
}

/**
 * GET /daily-reports/:id/:kind — one rep's report. No placeholder: flipping
 * Morning ↔ Evening must not leave the other kind's figures on screen.
 */
export function useRepDailyReport(
  salesInchargeId: string | undefined,
  kind: DailyReportKind,
  date: string,
) {
  return useQuery({
    queryKey: queryKeys.dailyReports.detail(salesInchargeId ?? '', kind, date),
    queryFn: () => fetchRepDailyReport(salesInchargeId!, kind, date),
    enabled: Boolean(salesInchargeId),
  })
}
