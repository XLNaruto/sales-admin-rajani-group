import { z } from 'zod'

/**
 * A single payment condition as the API sends it — the same shape on the list,
 * the GET-by-id read and the create/update responses. Transformed to the
 * client-facing shape here (`condition_name` → `name`) so nothing downstream
 * deals in snake_case; the audit timestamps are ignored (no screen shows them).
 */
export const paymentConditionRowSchema = z
  .object({
    id: z.number(),
    condition_name: z.string(),
  })
  .transform((r) => ({ id: r.id, name: r.condition_name }))

/** The payment-condition list envelope (rows + pagination metadata). */
export const paymentConditionListResponseSchema = z.object({
  payment_conditions: z.array(paymentConditionRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

/** DELETE /payment-conditions/{id} — `{ success: true }` once removed. */
export const paymentConditionDeleteResponseSchema = z.object({
  success: z.boolean(),
})

export type PaymentConditionRow = z.infer<typeof paymentConditionRowSchema>
export type PaymentConditionListResponse = z.infer<
  typeof paymentConditionListResponseSchema
>
