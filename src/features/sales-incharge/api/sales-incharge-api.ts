import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  salesInchargeListResponseSchema,
  type SalesInchargeListResponse,
  type SalesInchargeRow,
} from '../schemas'
import type {
  SalesIncharge,
  SalesInchargeListParams,
  SalesInchargeListResult,
} from '../types'

/** Map a validated API row to the client-facing (camelCase) shape. */
function toSalesIncharge(row: SalesInchargeRow): SalesIncharge {
  return {
    id: row.id,
    displayName: row.display_name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    employeeCode: row.employee_code ?? null,
    designation: row.designation ?? null,
    territory: row.territory ?? null,
    dateOfJoining: row.date_of_joining ?? null,
    status: row.status,
    reportsTo: row.reports_to ?? null,
  }
}

/** Pull rows + total out of whichever envelope the backend returned. */
function unwrap(res: SalesInchargeListResponse): { rows: SalesInchargeRow[]; total?: number } {
  if (Array.isArray(res)) return { rows: res }
  if ('data' in res) return { rows: res.data, total: res.total ?? res.count }
  if ('items' in res) return { rows: res.items, total: res.total ?? res.count }
  return { rows: res.results, total: res.total ?? res.count }
}

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: SalesInchargeListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.limit != null) q.limit = params.limit
  if (params.offset != null) q.offset = params.offset
  if (params.id != null) q.id = params.id
  if (params.reportsTo != null) q.reports_to = params.reportsTo
  if (params.search) q.search = params.search
  if (params.status) q.status = params.status
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /sales-incharge-admin/sales-incharges — list sales incharges. */
export async function fetchSalesIncharges(
  params: SalesInchargeListParams = {},
): Promise<SalesInchargeListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.SALES_INCHARGE.LIST, {
      params: toQuery(params),
    })
    const { rows, total } = unwrap(salesInchargeListResponseSchema.parse(raw))
    const items = rows.map(toSalesIncharge)
    return { items, total: total ?? items.length }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load sales incharges.'))
  }
}

/** DELETE /sales-incharge-admin/sales-incharges/{id} — remove a sales incharge. */
export async function deleteSalesIncharge(id: number): Promise<void> {
  try {
    await http.delete<void>(endpoints.SALES_INCHARGE.DELETE(id))
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to delete sales incharge.'))
  }
}
