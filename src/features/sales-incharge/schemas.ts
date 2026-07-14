import { z } from 'zod'

/** Status values the list endpoint returns. */
export const salesInchargeStatusSchema = z.enum([
  'active',
  'invited',
  'suspended',
  'inactive',
])

/**
 * A single row from GET /sales-incharge-admin/sales-incharges. Optional/nullable
 * fields are tolerated so a sparsely-populated record still validates.
 */
export const salesInchargeRowSchema = z.object({
  id: z.number(),
  display_name: z.string(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  employee_code: z.string().nullish(),
  designation: z.string().nullish(),
  territory: z.string().nullish(),
  date_of_joining: z.string().nullish(),
  status: salesInchargeStatusSchema.catch('inactive'),
  reports_to: z.number().nullish(),
})

/**
 * The list endpoint envelope. The backend may answer with a bare array or wrap
 * rows in a `data`/`items`/`results` envelope alongside a total — accept any of
 * these so the client isn't brittle to the exact pagination shape.
 */
export const salesInchargeListResponseSchema = z.union([
  z.array(salesInchargeRowSchema),
  z.object({
    data: z.array(salesInchargeRowSchema),
    total: z.number().optional(),
    count: z.number().optional(),
  }),
  z.object({
    items: z.array(salesInchargeRowSchema),
    total: z.number().optional(),
    count: z.number().optional(),
  }),
  z.object({
    results: z.array(salesInchargeRowSchema),
    total: z.number().optional(),
    count: z.number().optional(),
  }),
])

export type SalesInchargeRow = z.infer<typeof salesInchargeRowSchema>
export type SalesInchargeListResponse = z.infer<typeof salesInchargeListResponseSchema>
