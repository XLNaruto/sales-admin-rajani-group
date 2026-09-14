import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDayChange, fetchDayChanges, reviewDayChange } from './day-change-api'
import type { DayChangeListParams, DayChangeReview } from '../types'

/** GET /sales-incharge-admin/day-changes — live, server-filtered queue. */
export function useDayChangeList(
  params: DayChangeListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.fieldRequests.dayChanges(params as Record<string, unknown>),
    queryFn: () => fetchDayChanges(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharge-admin/day-changes — infinite ("All") variant. `params`
 * should NOT include `page` (the hook owns paging) but may carry the filters.
 */
export function useDayChangesInfinite(
  params: Omit<DayChangeListParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.fieldRequests.dayChangesInfinite(
      params as Record<string, unknown>,
    ),
    queryFn: ({ pageParam }) => fetchDayChanges({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  })
}


/**
 * GET /sales-incharge-admin/day-changes/{id} — one request in full.
 *
 * The deep-link read: a notification names a request, not a queue, and once the
 * request has been answered it is no longer on page 1 of anything. Kept fresh
 * on mount rather than cached long — the whole screen is a decision about a
 * record another admin may have answered a second ago.
 */
export function useDayChange(id: number | null) {
  return useQuery({
    queryKey: queryKeys.fieldRequests.dayChange(id ?? 0),
    queryFn: () => fetchDayChange(id as number),
    enabled: id != null,
    // A 404 here is an answer, not a blip: the request belongs to another
    // company, or to nobody. Retrying it just delays the explanation.
    retry: false,
  })
}

/**
 * PATCH /sales-incharge-admin/day-changes/{id}/status — approve or reject.
 *
 * An approval rewrites the date's work, so the journey caches are dropped
 * alongside the queue: a plan or live-day screen left open would otherwise keep
 * showing the day as it was allocated.
 */
export function useReviewDayChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, review }: { id: number; review: DayChangeReview }) =>
      reviewDayChange(id, review),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.fieldRequests.all })
      void qc.invalidateQueries({ queryKey: queryKeys.journey.all })
      // Answering a request is what makes its notification old news — the badge
      // and the feed have to follow, or the bell keeps advertising work done.
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.inbox.all })
    },
  })
}
