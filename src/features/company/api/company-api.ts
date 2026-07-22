import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api-error'
import { companiesResponseSchema } from '../schemas'
import type { CompaniesState } from '../types'
import type { CompaniesResponse } from '../schemas'

/** Map the validated wire shape to the camelCase client shape. */
function toCompaniesState(raw: CompaniesResponse): CompaniesState {
  return {
    companies: raw.companies,
    selectedCompanyId: raw.selected_company_id,
    requiresSelection: raw.requires_selection,
  }
}

/**
 * GET /sales-incharge-admin/me/companies — the companies (tenants) the current
 * sales admin belongs to, plus the active selection. `selected_company_id`
 * resolves automatically for single-company admins.
 */
export async function fetchMyCompanies(): Promise<CompaniesState> {
  try {
    const raw = await http.get<unknown>(endpoints.ME.COMPANIES)
    if (import.meta.env.DEV) console.debug('[companies] raw response:', raw)
    return toCompaniesState(companiesResponseSchema.parse(raw))
  } catch (error) {
    if (import.meta.env.DEV) console.error('[companies] fetch/parse failed:', error)
    throw new Error(getApiErrorMessage(error, "Couldn't load your companies."))
  }
}

/**
 * POST /sales-incharge-admin/me/company/select — switch which company (tenant)
 * the caller operates as. The selection is stored against the session
 * server-side, so subsequent requests are scoped to it. Returns the updated
 * tenant state.
 */
export async function selectMyCompany(companyId: number): Promise<CompaniesState> {
  try {
    const raw = await http.post<unknown, { company_id: number }>(
      endpoints.ME.SELECT_COMPANY,
      { company_id: companyId },
    )
    return toCompaniesState(companiesResponseSchema.parse(raw))
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Couldn't switch company."))
  }
}
