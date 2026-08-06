import { z } from 'zod'

/**
 * A single outlet type as the API sends it — the same shape on the list, the
 * GET-by-id read and the create/update responses. Transformed to the
 * client-facing shape here (`type_name` → `name`) so nothing downstream deals
 * in snake_case; the audit timestamps are ignored (no screen surfaces them).
 */
export const outletTypeRowSchema = z
  .object({
    id: z.number(),
    type_name: z.string(),
  })
  .transform((r) => ({ id: r.id, name: r.type_name }))

/** The outlet-type list envelope (rows + pagination metadata). */
export const outletTypeListResponseSchema = z.object({
  outlet_types: z.array(outletTypeRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

/** DELETE /outlet-types/{id} — `{ success: true }` once the row is removed. */
export const outletTypeDeleteResponseSchema = z.object({
  success: z.boolean(),
})

export type OutletTypeRow = z.infer<typeof outletTypeRowSchema>
export type OutletTypeListResponse = z.infer<typeof outletTypeListResponseSchema>
