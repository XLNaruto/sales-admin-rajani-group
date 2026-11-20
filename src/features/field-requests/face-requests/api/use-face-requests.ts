import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  deleteSalesInchargeFace,
  fetchFaceRequest,
  fetchFaceRequests,
  reviewFaceRequest,
} from './face-request-api'
import type { FaceRequestListParams, FaceRequestReview } from '../types'

/** GET /sales-incharge-admin/face-requests — live, server-filtered queue. */
export function useFaceRequestList(
  params: FaceRequestListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.fieldRequests.faceRequests(params as Record<string, unknown>),
    queryFn: () => fetchFaceRequests(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/** Infinite ("All") variant. `params` must not include `page` — the hook owns paging. */
export function useFaceRequestsInfinite(
  params: Omit<FaceRequestListParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.fieldRequests.faceRequestsInfinite(
      params as Record<string, unknown>,
    ),
    queryFn: ({ pageParam }) => fetchFaceRequests({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharge-admin/face-requests/{id} — the request and the rep's live
 * face, re-read on open so the status (and the face it would replace) is as it
 * stands now, not as it was when the queue loaded.
 */
export function useFaceRequest(id: number | null) {
  return useQuery({
    queryKey: queryKeys.fieldRequests.faceRequest(id ?? 0),
    queryFn: () => fetchFaceRequest(id as number),
    enabled: id != null,
    // A 404 is an answer (another company, or gone), not a blip.
    retry: false,
  })
}

/** PATCH /sales-incharge-admin/face-requests/{id}/status — approve or reject, then refresh. */
export function useReviewFaceRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, review }: { id: number; review: FaceRequestReview }) =>
      reviewFaceRequest(id, review),
    onSettled: () => {
      // Settled, not success: a 409 (already answered) means the rows on screen
      // are stale too, and the list must drop the row either way.
      void qc.invalidateQueries({ queryKey: queryKeys.fieldRequests.all })
      // An approved face changes the rep's record.
      void qc.invalidateQueries({ queryKey: queryKeys.salesIncharge.all })
      // Answering is what makes the request's notification old news.
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.inbox.all })
    },
  })
}

/**
 * DELETE /sales-incharge-admin/sales-incharges/{id}/face — remove the rep's
 * live face so he can register a new one. Takes the SALES INCHARGE id.
 */
export function useDeleteSalesInchargeFace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (salesInchargeId: number) => deleteSalesInchargeFace(salesInchargeId),
    onSettled: () => {
      // Settled, not success: a 404 (already gone) or 409 (a request is now
      // pending) means the `current_face` / status on screen is stale too.
      void qc.invalidateQueries({ queryKey: queryKeys.fieldRequests.all })
      void qc.invalidateQueries({ queryKey: queryKeys.salesIncharge.all })
    },
  })
}
