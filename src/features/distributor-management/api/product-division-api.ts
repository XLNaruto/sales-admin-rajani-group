import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api-error'
import { productDivisionListResponseSchema } from '../schemas'
import type { ProductDivisionListResult } from '../types'

/** Query params accepted by the product-division list endpoint. */
export interface ProductDivisionListParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: 'name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: ProductDivisionListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /sales-incharge-admin/product-divisions — the product-division master. */
export async function fetchProductDivisions(
  params: ProductDivisionListParams = {},
): Promise<ProductDivisionListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.PRODUCT_DIVISION.LIST, {
      params: toQuery(params),
    })
    const res = productDivisionListResponseSchema.parse(raw)
    const items = res.product_divisions.map((d) => ({ id: d.id, name: d.name }))
    return {
      items,
      total: res.total ?? items.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? items.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load product divisions.'))
  }
}
