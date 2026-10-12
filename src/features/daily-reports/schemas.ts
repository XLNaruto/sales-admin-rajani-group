/**
 * Wire schemas for `GET /daily-reports` and `GET /daily-reports/:id/:kind`.
 *
 * snake_case, because that is what the API speaks — the mapping to the camelCase
 * domain types happens in `api/`, never in a component. Measures default to `0`
 * inside a report that exists; a report that doesn't is `null`, and stays so.
 */
import { z } from 'zod'

/** An id that may arrive as a number or a string — normalised to a string. */
const id = z.union([z.number(), z.string()]).transform(String)

const num = z.coerce
  .number()
  .nullish()
  .transform((v) => v ?? 0)

const kind = z.enum(['morning', 'evening'])

export const measuresSchema = z.object({
  amount: num,
  kg: num,
  pieces: num,
  packs: z
    .array(z.object({ name: z.string(), quantity: num }))
    .nullish()
    .transform((v) => v ?? []),
})

export const countersSchema = z.object({
  sc: num,
  tc: num,
  pc: num,
  nc: num,
})

const centres = z
  .array(z.object({ city_id: id, name: z.string() }))
  .nullish()
  .transform((v) => v ?? [])

const marketRoutes = z
  .array(z.object({ beat_id: id, name: z.string() }))
  .nullish()
  .transform((v) => v ?? [])

const dealPersons = z
  .array(z.object({ distributor_id: id, name: z.string() }))
  .nullish()
  .transform((v) => v ?? [])

export const reportSummarySchema = z.object({
  centres,
  market_routes: marketRoutes,
  deal_persons: dealPersons,
  start_time: z.string(),
  close_time: z.string().nullish(),
  is_closed: z.boolean().nullish(),
  target: measuresSchema,
  retailing: measuresSchema,
  order_to_company: measuresSchema,
  counters: countersSchema,
})

export const dailyReportRowSchema = z.object({
  sales_incharge_id: id,
  sales_incharge_name: z.string().nullish(),
  employee_code: z.string().nullish(),
  kind,
  date: z.string(),
  report: reportSummarySchema.nullish(),
})

export const dailyReportsResponseSchema = z.object({
  daily_reports: z.array(dailyReportRowSchema).nullish(),
  total: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  page_size: z.coerce.number().optional(),
  total_pages: z.coerce.number().optional(),
})

export const divisionSchema = z.object({
  company_id: id,
  company_name: z.string().nullish(),
  target: measuresSchema,
  retailing: measuresSchema,
  order_to_company: measuresSchema,
})

export const remarkSchema = z.object({
  visit_id: id,
  party_type: z.enum(['retailer', 'distributor']),
  party_id: id,
  party_name: z.string().nullish(),
  check_in_at: z.string().nullish(),
  notes: z.string().nullish(),
  is_notes_in_audio: z.boolean().nullish(),
  description: z.string().nullish(),
  no_order_reason: z.string().nullish(),
})

export const repDailyReportSchema = z.object({
  sales_incharge_id: id,
  sales_incharge_name: z.string().nullish(),
  employee_code: z.string().nullish(),
  kind,
  date: z.string(),
  centres,
  market_routes: marketRoutes,
  deal_persons: dealPersons,
  start_time: z.string(),
  close_time: z.string().nullish(),
  is_closed: z.boolean().nullish(),
  divisions: z
    .array(divisionSchema)
    .nullish()
    .transform((v) => v ?? []),
  counters: countersSchema,
  remarks: z
    .array(remarkSchema)
    .nullish()
    .transform((v) => v ?? []),
})

export type DailyReportRowWire = z.infer<typeof dailyReportRowSchema>
export type RepDailyReportWire = z.infer<typeof repDailyReportSchema>
