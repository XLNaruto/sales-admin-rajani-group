/**
 * Daily Summary fetcher — one page of the per-rep day report for the selected
 * company. Read-only.
 */
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import { toDayType } from '../lib/daily-summary-format'
import {
  dailySummaryResponseSchema,
  salesDetailsResponseSchema,
  type DailySummaryRow,
  type SalesDetailsCallRow,
} from '../schemas'
import type {
  DailySummary,
  DailySummaryParams,
  DailySummaryResult,
  SalesDetails,
  SalesDetailsParams,
  SalesDetailsCallType,
  SalesDetailsPartyType,
  SalesDetailsRow,
} from '../types'

function toSummary(row: DailySummaryRow): DailySummary {
  return {
    salesInchargeId: row.sales_incharge_id,
    date: row.date,
    salesInchargeName: row.sales_incharge_name ?? 'Unnamed rep',
    employeeCode: row.employee_code ?? null,
    designationName: row.designation_name ?? null,
    dayType: toDayType(row.day_type),
    activityNames: row.activity_names,
    isJointWorking: Boolean(row.is_joint_working),
    jointWorkingNames: row.joint_working_names,
    logInAt: row.log_in_at ?? null,
    logOutAt: row.log_out_at ?? null,
    isDayOpen: Boolean(row.is_day_open),
    firstCallAt: row.first_call_at ?? null,
    counters: {
      sc: row.counters.sc,
      tc: row.counters.tc,
      inTurn: row.counters.in_turn,
      ovt: row.counters.ovt,
      to: row.counters.to,
      pc: row.counters.pc,
      ovc: row.counters.ovc,
    },
    totalPhysicalCalls: row.total_physical_calls,
    productivityPercentage: row.productivity_percentage,
    netValue: row.net_value,
    primaryOrderCount: row.primary_order_count,
    secondaryNetValue: row.secondary_net_value,
    secondaryOrderCount: row.secondary_order_count,
    secondaryLineCount: row.secondary_line_count,
    beatIds: row.beat_ids ?? [],
    beatNames: row.beat_names,
  }
}

/**
 * GET /daily-summary — every filter narrows `total`, so the envelope's paging
 * figures are the ones to trust; never derive a total from the array length.
 */
export async function fetchDailySummaries(
  params: DailySummaryParams,
): Promise<DailySummaryResult> {
  try {
    const raw = await http.get<unknown>(endpoints.DAILY_SUMMARY.LIST, {
      params: {
        date: params.date,
        state_id: params.stateId ? Number(params.stateId) : undefined,
        type: params.type,
        // An empty string fails validation — omitted instead.
        search: params.search || undefined,
        page: params.page,
        page_size: params.pageSize,
        sort_by: params.sortBy,
        sort_order: params.sortBy ? (params.sortOrder ?? 'desc') : undefined,
      },
    })
    const res = dailySummaryResponseSchema.parse(raw)
    const items = (res.daily_summaries ?? []).map(toSummary)
    return {
      items,
      total: res.total ?? 0,
      page: res.page ?? params.page,
      pageSize: res.page_size ?? params.pageSize,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load the daily summary.')
  }
}

const CALL_TYPES: SalesDetailsCallType[] = ['in_turn', 'out_of_turn', 'telephonic']
const PARTY_TYPES: SalesDetailsPartyType[] = ['retailer', 'distributor']

function toSalesDetailsRow(row: SalesDetailsCallRow, index: number): SalesDetailsRow {
  const visitId = row.visit_id ?? null
  const orderIds = row.order_ids ?? []
  const callType = CALL_TYPES.find((t) => t === row.call_type) ?? null
  return {
    key: visitId ? `v${visitId}` : orderIds[0] ? `o${orderIds[0]}` : `i${index}`,
    visitId,
    orderIds,
    at: row.at ?? null,
    beatName: row.beat_name ?? null,
    partyType: PARTY_TYPES.find((t) => t === row.party_type) ?? null,
    partyName: row.party_name ?? null,
    callType,
    isOvt: row.is_ovt ?? callType === 'out_of_turn',
    isProductive: Boolean(row.is_productive),
    qty: row.quantity,
    stdQty: row.std_quantity,
    value: row.value,
    discount: row.discount,
    netSales: row.net_sales,
  }
}

/**
 * GET /daily-summary/sales-details — one page of a rep's calls on a date, in
 * time order, with the orders booked in each. Same grant and order-status rule
 * as the list, so the day totals add up to the summary row. `type` filters the
 * rows server-side; `total` follows it, but `day_totals` and the MTD figures
 * always cover the whole day / month — never the page or the filter.
 */
export async function fetchSalesDetails(params: SalesDetailsParams): Promise<SalesDetails> {
  try {
    const raw = await http.get<unknown>(endpoints.DAILY_SUMMARY.SALES_DETAILS, {
      params: {
        sales_incharge_id: Number(params.salesInchargeId),
        date: params.date,
        type: params.type,
        page: params.page,
        page_size: params.pageSize,
      },
    })
    const res = salesDetailsResponseSchema.parse(raw)
    const t = res.day_totals
    return {
      salesInchargeId: res.sales_incharge_id,
      salesInchargeName: res.sales_incharge_name ?? null,
      date: res.date,
      dayTotals: {
        qty: t?.quantity ?? 0,
        stdQty: t?.std_quantity ?? 0,
        value: t?.value ?? 0,
        discount: t?.discount ?? 0,
        netSales: t?.net_sales ?? 0,
      },
      mtdFrom: res.mtd_from ?? null,
      mtdNetSales: res.mtd_net_sales,
      mtdPrimaryNetSales: res.mtd_primary_net_sales,
      mtdSecondaryNetSales: res.mtd_secondary_net_sales,
      rows: (res.sales_details ?? []).map(toSalesDetailsRow),
      total: res.total ?? 0,
      page: res.page ?? params.page,
      pageSize: res.page_size ?? params.pageSize,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load the sales details.')
  }
}
