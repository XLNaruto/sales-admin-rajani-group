/** Query hooks for the two live-day reads. */
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchLiveDay, fetchLiveMonth } from './live-day-api'

/**
 * GET /live-day/summaries — a window of field days. The server caps the range at
 * 31 days (a longer one is clamped, not rejected), so callers pass a month.
 */
export function useLiveMonth(params: {
  inchargeId: string | undefined
  fromDate: string
  toDate: string
}) {
  return useQuery({
    queryKey: queryKeys.journey.liveDays({
      inchargeId: params.inchargeId,
      fromDate: params.fromDate,
      toDate: params.toDate,
    }),
    queryFn: () =>
      fetchLiveMonth({
        inchargeId: params.inchargeId as string,
        fromDate: params.fromDate,
        toDate: params.toDate,
      }),
    placeholderData: keepPreviousData,
    enabled: Boolean(params.inchargeId),
  })
}

/** GET /live-day/detail — one day in full. */
export function useLiveDayDetail(params: { inchargeId: string | undefined; date: string }) {
  return useQuery({
    queryKey: queryKeys.journey.liveDay(params.inchargeId ?? '', params.date),
    queryFn: () =>
      fetchLiveDay({ inchargeId: params.inchargeId as string, date: params.date }),
    enabled: Boolean(params.inchargeId && params.date),
  })
}
