import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import {
  outletTypeDeleteResponseSchema,
  outletTypeListResponseSchema,
  outletTypeRowSchema,
} from '../schemas'
import type {
  OutletType,
  OutletTypeInput,
  OutletTypeListParams,
  OutletTypeListResult,
} from '../types'

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: OutletTypeListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** Build the create/update request body from the client-facing input. */
function toBody(input: OutletTypeInput) {
  return { type_name: input.name.trim() }
}

/**
 * GET /sales-incharge-admin/outlet-types — one page of the server-filtered
 * master. Also backs the retailer form's "Outlet Type" select, which fetches
 * the list whole and searches it in place.
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

/** GET /sales-incharge-admin/outlet-types/{id} — a single outlet type. */
export async function fetchOutletType(id: number): Promise<OutletType> {
  try {
    const raw = await http.get<unknown>(endpoints.OUTLET_TYPE.GET(id))
    return outletTypeRowSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to load the outlet type.')
  }
}

/**
 * POST /sales-incharge-admin/outlet-types — create a new outlet type. `409`s
 * when the name collides with a live one; the API's message is surfaced as-is.
 */
export async function createOutletType(input: OutletTypeInput): Promise<OutletType> {
  try {
    const raw = await http.post<unknown>(endpoints.OUTLET_TYPE.CREATE, toBody(input))
    return outletTypeRowSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to create the outlet type.')
  }
}

/** PATCH /sales-incharge-admin/outlet-types/{id} — rename an outlet type. */
export async function updateOutletType(
  id: number,
  input: OutletTypeInput,
): Promise<OutletType> {
  try {
    const raw = await http.patch<unknown>(endpoints.OUTLET_TYPE.UPDATE(id), toBody(input))
    return outletTypeRowSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to update the outlet type.')
  }
}

/**
 * DELETE /sales-incharge-admin/outlet-types/{id} — remove an outlet type. The
 * API refuses with `409 OUTLET_TYPE_IN_USE` while any retailer is still
 * classified into it; that message reaches the caller unchanged.
 */
export async function deleteOutletType(id: number): Promise<void> {
  try {
    const raw = await http.delete<unknown>(endpoints.OUTLET_TYPE.DELETE(id))
    outletTypeDeleteResponseSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to delete the outlet type.')
  }
}
