import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import { dayChangeListResponseSchema, dayChangeReviewResponseSchema } from '../schemas'
import type {
  DayChangeListParams,
  DayChangeListResult,
  DayChangeReview,
  DayChangeReviewResult,
} from '../types'

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: DayChangeListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.status) q.status = params.status
  if (params.operation) q.operation = params.operation
  if (params.salesInchargeId != null) q.sales_incharge_id = params.salesInchargeId
  if (params.fromDate) q.from_date = params.fromDate
  if (params.toDate) q.to_date = params.toDate
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/**
 * GET /sales-incharge-admin/day-changes — one page of the queue.
 *
 * `status` is left off rather than defaulted client-side when the caller wants
 * the endpoint's own default (`pending`).
 */
export async function fetchDayChanges(
  params: DayChangeListParams = {},
): Promise<DayChangeListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.DAY_CHANGE.LIST, {
      params: toQuery(params),
    })
    const res = dayChangeListResponseSchema.parse(raw)
    return {
      items: res.day_changes,
      total: res.total ?? res.day_changes.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? res.day_changes.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load day change requests.')
  }
}

/**
 * PATCH /sales-incharge-admin/day-changes/{id}/status — approve or reject.
 *
 * Approving is what WRITES THE DAY, and the request and the write happen in one
 * transaction. Every precondition is re-checked at this moment (a beat may since
 * have been de-allocated, the date may have acquired work), so a proposal that
 * has gone stale comes back as a `400`/`409` with the reason, which reaches the
 * caller unchanged.
 */
export async function reviewDayChange(
  id: number,
  review: DayChangeReview,
): Promise<DayChangeReviewResult> {
  const body =
    review.status === 'approved'
      ? { status: 'approved' as const }
      : { status: 'rejected' as const, rejection_reason: review.rejectionReason.trim() }

  try {
    const raw = await http.patch<unknown>(endpoints.DAY_CHANGE.STATUS(id), body)
    return dayChangeReviewResponseSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to review the day change request.')
  }
}
