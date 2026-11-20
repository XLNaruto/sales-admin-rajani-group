import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import {
  retailerEditRequestDetailSchema,
  retailerEditRequestListResponseSchema,
  retailerEditReviewResponseSchema,
} from '../schemas'
import type {
  RetailerEditRequest,
  RetailerEditRequestDetail,
  RetailerEditRequestListParams,
  RetailerEditRequestListResult,
  RetailerEditReview,
} from '../types'

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: RetailerEditRequestListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.status) q.status = params.status
  if (params.salesInchargeId != null) q.sales_incharge_id = params.salesInchargeId
  if (params.retailerId != null) q.retailer_id = params.retailerId
  if (params.search) q.search = params.search
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /sales-incharge-admin/retailer-edit-requests — one page of the queue. */
export async function fetchRetailerEditRequests(
  params: RetailerEditRequestListParams = {},
): Promise<RetailerEditRequestListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.RETAILER_EDIT_REQUEST.LIST, {
      params: toQuery(params),
    })
    const res = retailerEditRequestListResponseSchema.parse(raw)
    return {
      items: res.retailer_edit_requests,
      total: res.total ?? res.retailer_edit_requests.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? res.retailer_edit_requests.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load retailer edit requests.')
  }
}

/**
 * GET /sales-incharge-admin/retailer-edit-requests/{id} — one request plus
 * `current_retailer`, the outlet as it is now (null if it was deleted).
 */
export async function fetchRetailerEditRequest(
  id: number,
): Promise<RetailerEditRequestDetail> {
  try {
    const raw = await http.get<unknown>(endpoints.RETAILER_EDIT_REQUEST.GET(id))
    return retailerEditRequestDetailSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to load the retailer edit request.')
  }
}

/**
 * PATCH /sales-incharge-admin/retailer-edit-requests/{id}/status.
 *
 * Approving applies `payload` to the outlet in one server transaction (fields,
 * owners, beat + beat membership, change log); if any of it fails nothing is
 * saved and the request stays `pending`. Rejecting leaves the outlet untouched.
 */
export async function reviewRetailerEditRequest(
  id: number,
  review: RetailerEditReview,
): Promise<RetailerEditRequest> {
  const reason = review.reason?.trim()
  // Omitted rather than sent empty on an approval with no note.
  const body = { status: review.status, ...(reason ? { reason } : {}) }

  try {
    const raw = await http.patch<unknown>(endpoints.RETAILER_EDIT_REQUEST.STATUS(id), body)
    return retailerEditReviewResponseSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to review the retailer edit request.')
  }
}
