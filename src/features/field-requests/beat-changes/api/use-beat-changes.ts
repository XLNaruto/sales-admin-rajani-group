import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchBeatChanges, reviewBeatChange } from './beat-change-api'
import type { BeatChangeListParams, BeatChangeReview } from '../types'

/** GET /sales-incharge-admin/beat-changes — live, server-filtered queue. */
export function useBeatChangeList(
  params: BeatChangeListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.fieldRequests.beatChanges(params as Record<string, unknown>),
    queryFn: () => fetchBeatChanges(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharge-admin/beat-changes — infinite ("All") variant. `params`
 * should NOT include `page` (the hook owns paging) but may carry the filters.
 */
export function useBeatChangesInfinite(
  params: Omit<BeatChangeListParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.fieldRequests.beatChangesInfinite(
      params as Record<string, unknown>,
    ),
    queryFn: ({ pageParam }) => fetchBeatChanges({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  })
}

/**
 * PATCH /sales-incharge-admin/beat-changes/{id}/status — approve or reject.
 *
 * An approval rewrites the day's walk, so the journey caches are dropped
 * alongside the queue: a plan or live-day screen left open would otherwise keep
 * showing the beat that has just been swapped out.
 */
export function useReviewBeatChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, review }: { id: number; review: BeatChangeReview }) =>
      reviewBeatChange(id, review),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.fieldRequests.all })
      void qc.invalidateQueries({ queryKey: queryKeys.journey.all })
    },
  })
}
