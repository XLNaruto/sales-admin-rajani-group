/**
 * Daily Summary fetcher — one page of the per-rep day report for the selected
 * company. Read-only.
 */
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import { toDayType } from '../lib/daily-summary-format'
import { dailySummaryResponseSchema, type DailySummaryRow } from '../schemas'
import type { DailySummary, DailySummaryParams, DailySummaryResult } from '../types'

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
