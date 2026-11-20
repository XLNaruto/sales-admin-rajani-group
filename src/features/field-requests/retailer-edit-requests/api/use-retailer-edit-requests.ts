import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchRetailerEditRequest,
  fetchRetailerEditRequests,
  reviewRetailerEditRequest,
} from './retailer-edit-request-api'
import type { RetailerEditRequestListParams, RetailerEditReview } from '../types'

/** GET /sales-incharge-admin/retailer-edit-requests — live, server-filtered queue. */
export function useRetailerEditRequestList(
  params: RetailerEditRequestListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.fieldRequests.retailerEdits(params as Record<string, unknown>),
    queryFn: () => fetchRetailerEditRequests(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/** Infinite ("All") variant. `params` must not include `page` — the hook owns paging. */
export function useRetailerEditRequestsInfinite(
  params: Omit<RetailerEditRequestListParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.fieldRequests.retailerEditsInfinite(
      params as Record<string, unknown>,
    ),
    queryFn: ({ pageParam }) => fetchRetailerEditRequests({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharge-admin/retailer-edit-requests/{id} — re-read on open so
 * both the status and the outlet it would change are as they stand now.
 */
export function useRetailerEditRequest(id: number | null) {
  return useQuery({
    queryKey: queryKeys.fieldRequests.retailerEdit(id ?? 0),
    queryFn: () => fetchRetailerEditRequest(id as number),
    enabled: id != null,
    // A 404 is an answer (gone), not a blip.
    retry: false,
  })
}

/** PATCH /sales-incharge-admin/retailer-edit-requests/{id}/status — approve or reject. */
export function useReviewRetailerEditRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, review }: { id: number; review: RetailerEditReview }) =>
      reviewRetailerEditRequest(id, review),
    onSettled: () => {
      // Settled, not success: a 409 (already answered) means the rows on
      // screen are stale too.
      void qc.invalidateQueries({ queryKey: queryKeys.fieldRequests.all })
      // An approval rewrites the outlet and re-syncs its beat membership.
      void qc.invalidateQueries({ queryKey: queryKeys.retailers.all })
      void qc.invalidateQueries({ queryKey: queryKeys.beats.all })
      // Answering is what makes the request's notification old news.
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.inbox.all })
    },
  })
}
