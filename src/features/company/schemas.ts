import { z } from 'zod'

/** One company (tenant) entry. */
export const companySchema = z.object({
  id: z.number(),
  name: z.string(),
})

/**
 * Response shape shared by `GET /me/companies` and `POST /me/company/select`.
 * Validated then mapped to the camelCase `CompaniesState` client shape.
 */
export const companiesResponseSchema = z.object({
  companies: z.array(companySchema),
  selected_company_id: z.number().nullable(),
  requires_selection: z.boolean(),
})

export type CompaniesResponse = z.infer<typeof companiesResponseSchema>
