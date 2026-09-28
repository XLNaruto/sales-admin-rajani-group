import { z } from 'zod'

/** The three states a profile edit request can be in. */
export const profileEditRequestStatusSchema = z.enum(['pending', 'approved', 'rejected'])

/** Who raised the request — a sales incharge or a distributor. */
export const profileEditRequesterTypeSchema = z.enum(['sales_incharge', 'distributor'])

/**
 * One profile-edit-request row as the API sends it — the same shape on the
 * list, the GET-by-id read and the review response. Mapped to the client-facing
 * camelCase shape here, so nothing downstream deals in snake_case.
 */
export const profileEditRequestRowSchema = z
  .object({
    id: z.number(),
    message: z.string(),
    status: profileEditRequestStatusSchema,
    requested_at: z.string(),
    reviewed_at: z.string().nullable(),
    review_reason: z.string().nullable(),
    // Older payloads predate distributor requests and omit the type.
    requester_type: profileEditRequesterTypeSchema.optional().default('sales_incharge'),
    sales_incharge_id: z.number().nullish(),
    sales_incharge_name: z.string().nullish(),
    sales_incharge_phone: z.string().nullish(),
    employee_code: z.string().nullish(),
    distributor_id: z.number().nullish(),
    distributor_name: z.string().nullish(),
    distributor_phone: z.string().nullish(),
    distributor_code: z.string().nullish(),
  })
  .transform((r) => {
    const isDistributor = r.requester_type === 'distributor'
    return {
      id: r.id,
      message: r.message,
      status: r.status,
      requestedAt: r.requested_at,
      reviewedAt: r.reviewed_at,
      reviewReason: r.review_reason,
      requesterType: r.requester_type,
      requesterId: (isDistributor ? r.distributor_id : r.sales_incharge_id) ?? null,
      requesterName: (isDistributor ? r.distributor_name : r.sales_incharge_name) ?? null,
      requesterPhone: (isDistributor ? r.distributor_phone : r.sales_incharge_phone) ?? null,
      requesterCode: (isDistributor ? r.distributor_code : r.employee_code) ?? null,
    }
  })

/** The profile-edit-request list envelope (rows + pagination metadata). */
export const profileEditRequestListResponseSchema = z.object({
  profile_edit_requests: z.array(profileEditRequestRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

/** PATCH /profile-edit-requests/{id}/status — the request as it now stands. */
export const profileEditReviewResponseSchema = z
  .object({ profile_edit_request: profileEditRequestRowSchema })
  .transform((r) => r.profile_edit_request)
