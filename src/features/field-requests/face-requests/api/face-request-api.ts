import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import {
  faceRequestDetailSchema,
  faceRequestListResponseSchema,
  faceRequestReviewResponseSchema,
} from '../schemas'
import type {
  FaceRequest,
  FaceRequestDetail,
  FaceRequestListParams,
  FaceRequestListResult,
  FaceRequestReview,
} from '../types'

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: FaceRequestListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.status) q.status = params.status
  if (params.type) q.type = params.type
  if (params.salesInchargeId != null) q.sales_incharge_id = params.salesInchargeId
  if (params.search) q.search = params.search
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /sales-incharge-admin/face-requests — one page of the queue. */
export async function fetchFaceRequests(
  params: FaceRequestListParams = {},
): Promise<FaceRequestListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.FACE_REQUEST.LIST, {
      params: toQuery(params),
    })
    const res = faceRequestListResponseSchema.parse(raw)
    return {
      items: res.face_requests,
      total: res.total ?? res.face_requests.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? res.face_requests.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load face requests.')
  }
}

/**
 * GET /sales-incharge-admin/face-requests/{id} — one request plus the rep's
 * live face. A request outside the selected company answers `404`.
 */
export async function fetchFaceRequest(id: number): Promise<FaceRequestDetail> {
  try {
    const raw = await http.get<unknown>(endpoints.FACE_REQUEST.GET(id))
    return faceRequestDetailSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to load the face request.')
  }
}

/**
 * PATCH /sales-incharge-admin/face-requests/{id}/status.
 *
 * Approving applies the face in one server transaction (an `add` registers it,
 * an `edit` updates it); if applying fails the request stays `pending`.
 * Rejecting leaves the live face untouched.
 */
export async function reviewFaceRequest(
  id: number,
  review: FaceRequestReview,
): Promise<FaceRequest> {
  const body =
    review.status === 'rejected'
      ? { status: review.status, reject_reason: review.rejectReason.trim() }
      : { status: review.status }

  try {
    const raw = await http.patch<unknown>(endpoints.FACE_REQUEST.STATUS(id), body)
    return faceRequestReviewResponseSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to review the face request.')
  }
}

/**
 * DELETE /sales-incharge-admin/sales-incharges/{salesInchargeId}/face.
 *
 * Soft-deletes the rep's live face and its images in one server transaction;
 * face requests are left as they are. Afterwards the rep's profile reads
 * `face: null` and he can register again with a new `add` request. Refused
 * (`409`) while he has a pending face request.
 */
export async function deleteSalesInchargeFace(salesInchargeId: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.SALES_INCHARGE.FACE(salesInchargeId))
  } catch (error) {
    throw asApiError(error, "Failed to delete the rep's face.")
  }
}
