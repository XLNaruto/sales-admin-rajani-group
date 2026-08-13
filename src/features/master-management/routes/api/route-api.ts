import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import { routeListResponseSchema } from '../schemas'
import type { RouteListParams, RouteListResult } from '../types'

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: RouteListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.id != null) q.id = params.id
  if (params.warehouseId != null) q.warehouse_id = params.warehouseId
  if (params.search) q.search = params.search
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/**
 * GET /sales-incharge-admin/routes — one page of the route master. Read-only
 * (the API exposes no writes); the distributor form is its only consumer.
 */
export async function fetchRoutes(params: RouteListParams = {}): Promise<RouteListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.ROUTE.LIST, {
      params: toQuery(params),
    })
    const res = routeListResponseSchema.parse(raw)
    return {
      items: res.routes.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        warehouseId: r.warehouse_id,
        warehouseName: r.warehouse_name ?? null,
      })),
      total: res.total,
      page: res.page,
      pageSize: res.page_size,
      totalPages: res.total_pages,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load routes.')
  }
}
