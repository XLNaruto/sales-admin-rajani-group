import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import {
  profileEditRequestListResponseSchema,
  profileEditRequestRowSchema,
  profileEditReviewResponseSchema,
} from '../schemas'
import type {
  ProfileEditRequest,
  ProfileEditRequestListParams,
  ProfileEditRequestListResult,
  ProfileEditReview,
} from '../types'

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(
  params: ProfileEditRequestListParams,
): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.status) q.status = params.status
  if (params.salesInchargeId != null) q.sales_incharge_id = params.salesInchargeId
  if (params.search) q.search = params.search
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/**
 * GET /sales-incharge-admin/profile-edit-requests — one page of the queue.
 *
 * `status` is left off rather than defaulted client-side when the caller wants
 * the endpoint's own default (`pending`).
 */
export async function fetchProfileEditRequests(
  params: ProfileEditRequestListParams = {},
): Promise<ProfileEditRequestListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.PROFILE_EDIT_REQUEST.LIST, {
      params: toQuery(params),
    })
    const res = profileEditRequestListResponseSchema.parse(raw)
    return {
      items: res.profile_edit_requests,
      total: res.total ?? res.profile_edit_requests.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? res.profile_edit_requests.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load profile edit requests.')
  }
}

/**
 * GET /sales-incharge-admin/profile-edit-requests/{id} — one request in full.
 * A request outside the selected company answers `404`, exactly as a
 * non-existent one does.
 */
export async function fetchProfileEditRequest(
  id: number,
): Promise<ProfileEditRequest> {
  try {
    const raw = await http.get<unknown>(endpoints.PROFILE_EDIT_REQUEST.GET(id))
    return profileEditRequestRowSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to load the profile edit request.')
  }
}

/**
 * PATCH /sales-incharge-admin/profile-edit-requests/{id}/status.
 *
 * Approving does NOT rewrite the profile — the ask is prose, so there is
 * nothing to apply. It records that the change will be made; the correction
 * itself goes through the Sales Incharge Master, which is what leaves it in the
 * change log under the row that actually changed. A request that is no longer
 * `pending` answers `409`, including when two admins click at the same moment.
 */
export async function reviewProfileEditRequest(
  id: number,
  review: ProfileEditReview,
): Promise<ProfileEditRequest> {
  const reason = review.reason?.trim()
  const body = {
    status: review.status,
    // Omitted rather than sent empty on an approval with no note — the API
    // rejects a blank string, and "no note" is a real answer here.
    ...(reason ? { reason } : {}),
  }

  try {
    const raw = await http.patch<unknown>(
      endpoints.PROFILE_EDIT_REQUEST.STATUS(id),
      body,
    )
    return profileEditReviewResponseSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to review the profile edit request.')
  }
}
