import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import { outletTypeListResponseSchema } from '../schemas'
import type { OutletTypeListResult } from '../types'

/** Query params accepted by the outlet-type list endpoint. */
export interface OutletTypeListParams {
  page?: number
  pageSize?: number
  search?: string
  /** Only `active`/`inactive`. */
  status?: 'active' | 'inactive'
  /** The endpoint's documented `sort_by` enum. */
  sortBy?: 'type_name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: OutletTypeListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  if (params.status) q.status = params.status
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/**
 * GET /sales-incharge-admin/outlet-types — the master backing the retailer
 * form's "Outlet Type" select. Small list; fetched whole and searched in-place.
 */
export async function fetchOutletTypes(
  params: OutletTypeListParams = {},
): Promise<OutletTypeListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.OUTLET_TYPE.LIST, {
      params: toQuery(params),
    })
    const res = outletTypeListResponseSchema.parse(raw)
    return {
      items: res.outlet_types,
      total: res.total ?? res.outlet_types.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? res.outlet_types.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load outlet types.')
  }
}
