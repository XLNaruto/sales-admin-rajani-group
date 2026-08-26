import { z } from 'zod'

/** The three states a profile edit request can be in. */
export const profileEditRequestStatusSchema = z.enum(['pending', 'approved', 'rejected'])

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
    sales_incharge_id: z.number(),
    sales_incharge_name: z.string().nullable(),
    sales_incharge_phone: z.string().nullable(),
    employee_code: z.string().nullable(),
  })
  .transform((r) => ({
    id: r.id,
    message: r.message,
    status: r.status,
    requestedAt: r.requested_at,
    reviewedAt: r.reviewed_at,
    reviewReason: r.review_reason,
    salesInchargeId: r.sales_incharge_id,
    salesInchargeName: r.sales_incharge_name,
    salesInchargePhone: r.sales_incharge_phone,
    employeeCode: r.employee_code,
  }))

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
