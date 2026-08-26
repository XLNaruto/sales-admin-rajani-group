import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchProfileEditRequest,
  fetchProfileEditRequests,
  reviewProfileEditRequest,
} from './profile-edit-request-api'
import type { ProfileEditRequestListParams, ProfileEditReview } from '../types'

/** GET /sales-incharge-admin/profile-edit-requests — live, server-filtered queue. */
export function useProfileEditRequestList(
  params: ProfileEditRequestListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.fieldRequests.profileEdits(params as Record<string, unknown>),
    queryFn: () => fetchProfileEditRequests(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharge-admin/profile-edit-requests — infinite ("All") variant.
 * `params` should NOT include `page` (the hook owns paging) but may carry the
 * filters and search term.
 */
export function useProfileEditRequestsInfinite(
  params: Omit<ProfileEditRequestListParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.fieldRequests.profileEditsInfinite(
      params as Record<string, unknown>,
    ),
    queryFn: ({ pageParam }) => fetchProfileEditRequests({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharge-admin/profile-edit-requests/{id} — one request in full.
 *
 * The list row carries the same fields, so this is not about extra columns: a
 * request can be answered by another admin while the queue sits on screen, and
 * the API refuses a second answer with a `409`. Re-reading on open is what makes
 * the detail view state the request as it stands now.
 */
export function useProfileEditRequest(id: number | null) {
  return useQuery({
    queryKey: queryKeys.fieldRequests.profileEdit(id ?? 0),
    queryFn: () => fetchProfileEditRequest(id as number),
    enabled: id != null,
  })
}

/**
 * PATCH /sales-incharge-admin/profile-edit-requests/{id}/status — approve or
 * reject, then refresh the queue.
 */
export function useReviewProfileEditRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, review }: { id: number; review: ProfileEditReview }) =>
      reviewProfileEditRequest(id, review),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.fieldRequests.all }),
  })
}
