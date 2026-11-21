/**
 * Wire schema for `GET /daily-summary`.
 *
 * snake_case, because that is what the API speaks — the mapping to the camelCase
 * domain types happens in `api/`, never in a component. Counters default to `0`
 * rather than failing the row: an absent rep is a row of zeros, which is an
 * answer, not a missing value.
 */
import { z } from 'zod'

/** An id that may arrive as a number or a string — normalised to a string. */
const id = z.union([z.number(), z.string()]).transform(String)

const num = z.coerce
  .number()
  .nullish()
  .transform((v) => v ?? 0)

const strings = z
  .array(z.string())
  .nullish()
  .transform((v) => v ?? [])

export const dailySummaryCountersSchema = z.object({
  sc: num,
  tc: num,
  in_turn: num,
  ovt: num,
  to: num,
  pc: num,
  ovc: num,
})

export const dailySummaryRowSchema = z.object({
  sales_incharge_id: id,
  date: z.string(),
  sales_incharge_name: z.string().nullish(),
  employee_code: z.string().nullish(),
  designation_name: z.string().nullish(),
  day_type: z.string(),
  activity_names: strings,
  is_joint_working: z.boolean().nullish(),
  joint_working_names: strings,
  log_in_at: z.string().nullish(),
  log_out_at: z.string().nullish(),
  is_day_open: z.boolean().nullish(),
  first_call_at: z.string().nullish(),
  counters: dailySummaryCountersSchema,
  total_physical_calls: num,
  productivity_percentage: num,
  /** Primary-only, kept as is for older clients. */
  net_value: num,
  primary_order_count: num,
  secondary_net_value: num,
  secondary_order_count: num,
  secondary_line_count: num,
  beat_ids: z.array(id).nullish(),
  beat_names: strings,
})

export const dailySummaryResponseSchema = z.object({
  daily_summaries: z.array(dailySummaryRowSchema).nullish(),
  total: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  page_size: z.coerce.number().optional(),
  total_pages: z.coerce.number().optional(),
})

export type DailySummaryRow = z.infer<typeof dailySummaryRowSchema>

/* ------------------- GET /daily-summary/sales-details -------------------- */

export const salesDetailsCallSchema = z.object({
  /** Null for an order booked with no visit. */
  visit_id: id.nullish(),
  order_ids: z.array(id).nullish(),
  /** The call's check-in, or the order's time for a visit-less order. */
  at: z.string().nullish(),
  beat_id: id.nullish(),
  beat_name: z.string().nullish(),
  party_type: z.string().nullish(),
  party_id: id.nullish(),
  party_name: z.string().nullish(),
  call_type: z.string().nullish(),
  is_ovt: z.boolean().nullish(),
  is_productive: z.boolean().nullish(),
  quantity: num,
  std_quantity: num,
  value: num,
  discount: num,
  net_sales: num,
})

const salesDetailsTotalsSchema = z.object({
  quantity: num,
  std_quantity: num,
  value: num,
  discount: num,
  net_sales: num,
})

export const salesDetailsResponseSchema = z.object({
  sales_incharge_id: id,
  sales_incharge_name: z.string().nullish(),
  date: z.string(),
  mtd_from: z.string().nullish(),
  mtd_net_sales: num,
  mtd_primary_net_sales: num,
  mtd_secondary_net_sales: num,
  /** Whole-day totals — not just this page's rows. */
  day_totals: salesDetailsTotalsSchema.nullish(),
  sales_details: z.array(salesDetailsCallSchema).nullish(),
  total: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  page_size: z.coerce.number().optional(),
  total_pages: z.coerce.number().optional(),
})

export type SalesDetailsCallRow = z.infer<typeof salesDetailsCallSchema>
