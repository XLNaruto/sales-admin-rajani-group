import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import { categoryListResponseSchema, type CategoryRow } from '../schemas'
import type { CategoryListParams } from '../types'

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: CategoryListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.type) q.type = params.type
  if (params.status) q.status = params.status
  if (params.search) q.search = params.search
  return q
}

/**
 * GET /sales-incharge-admin/categories — one page of the category master for
 * the admin's currently selected company (403 COMPANY_NOT_SELECTED without one).
 */
export async function fetchCategories(
  params: CategoryListParams = {},
): Promise<CategoryRow[]> {
  try {
    const raw = await http.get<unknown>(endpoints.CATEGORY.LIST, {
      params: toQuery(params),
    })
    return categoryListResponseSchema.parse(raw).categories
  } catch (error) {
    throw asApiError(error, 'Failed to load categories.')
  }
}
