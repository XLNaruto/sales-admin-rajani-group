import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import { beatChangeListResponseSchema, beatChangeReviewResponseSchema } from '../schemas'
import type {
  BeatChangeListParams,
  BeatChangeListResult,
  BeatChangeReview,
  BeatChangeReviewResult,
} from '../types'

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: BeatChangeListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.status) q.status = params.status
  if (params.salesInchargeId != null) q.sales_incharge_id = params.salesInchargeId
  if (params.fromDate) q.from_date = params.fromDate
  if (params.toDate) q.to_date = params.toDate
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/**
 * GET /sales-incharge-admin/beat-changes — one page of the queue.
 *
 * `status` is left off rather than defaulted client-side when the caller wants
 * the endpoint's own default (`pending`).
 */
export async function fetchBeatChanges(
  params: BeatChangeListParams = {},
): Promise<BeatChangeListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.BEAT_CHANGE.LIST, {
      params: toQuery(params),
    })
    const res = beatChangeListResponseSchema.parse(raw)
    return {
      items: res.beat_changes,
      total: res.total ?? res.beat_changes.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? res.beat_changes.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load beat change requests.')
  }
}

/**
 * PATCH /sales-incharge-admin/beat-changes/{id}/status — approve or reject.
 *
 * Approving is what moves the day, so the API re-checks every precondition and
 * refuses a request that has gone stale (the beat de-allocated, the day locked
 * by a visit that has landed). Those refusals arrive as a `409`/`400` with the
 * reason in the message, which reaches the caller unchanged.
 */
export async function reviewBeatChange(
  id: number,
  review: BeatChangeReview,
): Promise<BeatChangeReviewResult> {
  const body =
    review.status === 'approved'
      ? { status: 'approved' as const }
      : { status: 'rejected' as const, rejection_reason: review.rejectionReason.trim() }

  try {
    const raw = await http.patch<unknown>(endpoints.BEAT_CHANGE.STATUS(id), body)
    return beatChangeReviewResponseSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to review the beat change request.')
  }
}
