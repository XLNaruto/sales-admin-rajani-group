/** Query hook for the Daily Summary read. */
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDailySummaries, fetchSalesDetails } from './daily-summary-api'
import type { DailySummaryParams, SalesDetailsParams } from '../types'

/**
 * GET /daily-summary — one page of rows. Keeps the previous page on screen while
 * a filter, sort or page change is in flight, so the table doesn't blank.
 * A company switch invalidates every query, which refetches this one.
 */
export function useDailySummaries(params: DailySummaryParams) {
  return useQuery({
    queryKey: queryKeys.dailySummary.list(params as unknown as Record<string, unknown>),
    queryFn: () => fetchDailySummaries(params),
    placeholderData: keepPreviousData,
  })
}

/**
 * GET /daily-summary/sales-details — one page of a rep's calls and sales on a
 * day. Keeps the previous page on screen while paging. Idle without a rep.
 */
export function useDailySummarySalesDetails(params: SalesDetailsParams | null) {
  return useQuery({
    queryKey: queryKeys.dailySummary.salesDetails(
      (params ?? {}) as unknown as Record<string, unknown>,
    ),
    queryFn: () => fetchSalesDetails(params as SalesDetailsParams),
    enabled: Boolean(params),
    placeholderData: keepPreviousData,
  })
}
