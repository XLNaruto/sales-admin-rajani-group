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
  net_value: num,
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
