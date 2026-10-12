/**
 * Daily Reports fetchers — the per-rep morning / evening reports for the
 * selected company. Read-only.
 */
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import { toNoOrderReason } from '../lib/daily-report-format'
import {
  dailyReportsResponseSchema,
  repDailyReportSchema,
  type DailyReportRowWire,
  type RepDailyReportWire,
} from '../schemas'
import type {
  DailyReportKind,
  DailyReportMeasures,
  DailyReportRef,
  DailyReportRow,
  DailyReportsParams,
  DailyReportsResult,
  RepDailyReport,
} from '../types'

type MeasuresWire = NonNullable<DailyReportRowWire['report']>['target']
type RefsWire = Pick<RepDailyReportWire, 'centres' | 'market_routes' | 'deal_persons'>

function toMeasures(wire: MeasuresWire): DailyReportMeasures {
  return { amount: wire.amount, kg: wire.kg, pieces: wire.pieces, packs: wire.packs }
}

function toRefs(wire: RefsWire): {
  centres: DailyReportRef[]
  marketRoutes: DailyReportRef[]
  dealPersons: DailyReportRef[]
} {
  return {
    centres: wire.centres.map((c) => ({ id: c.city_id, name: c.name })),
    marketRoutes: wire.market_routes.map((b) => ({ id: b.beat_id, name: b.name })),
    dealPersons: wire.deal_persons.map((d) => ({ id: d.distributor_id, name: d.name })),
  }
}

function toRow(row: DailyReportRowWire): DailyReportRow {
  const report = row.report
  return {
    salesInchargeId: row.sales_incharge_id,
    salesInchargeName: row.sales_incharge_name ?? 'Unnamed rep',
    employeeCode: row.employee_code ?? null,
    kind: row.kind,
    date: row.date,
    report: report
      ? {
          ...toRefs(report),
          startTime: report.start_time,
          closeTime: report.close_time ?? null,
          isClosed: Boolean(report.is_closed),
          target: toMeasures(report.target),
          retailing: toMeasures(report.retailing),
          orderToCompany: toMeasures(report.order_to_company),
          counters: report.counters,
        }
      : null,
  }
}

function toRepReport(wire: RepDailyReportWire): RepDailyReport {
  return {
    salesInchargeId: wire.sales_incharge_id,
    salesInchargeName: wire.sales_incharge_name ?? 'Unnamed rep',
    employeeCode: wire.employee_code ?? null,
    kind: wire.kind,
    date: wire.date,
    ...toRefs(wire),
    startTime: wire.start_time,
    closeTime: wire.close_time ?? null,
    isClosed: Boolean(wire.is_closed),
    divisions: wire.divisions.map((division) => ({
      companyId: division.company_id,
      companyName: division.company_name ?? 'Selected company',
      target: toMeasures(division.target),
      retailing: toMeasures(division.retailing),
      orderToCompany: toMeasures(division.order_to_company),
    })),
    counters: wire.counters,
    remarks: wire.remarks.map((remark) => ({
      visitId: remark.visit_id,
      partyType: remark.party_type,
      partyId: remark.party_id,
      partyName: remark.party_name ?? null,
      checkInAt: remark.check_in_at ?? null,
      notes: remark.notes ?? null,
      isNotesInAudio: Boolean(remark.is_notes_in_audio),
      description: remark.description ?? null,
      noOrderReason: toNoOrderReason(remark.no_order_reason),
    })),
  }
}

/**
 * GET /daily-reports — one row per active rep of the selected company,
 * including reps with no such report. Sorted by name server-side; `search` and
 * `has_report` both narrow `total`, so the envelope's paging figures are the
 * ones to trust.
 */
export async function fetchDailyReports(params: DailyReportsParams): Promise<DailyReportsResult> {
  try {
    const raw = await http.get<unknown>(endpoints.DAILY_REPORT.LIST, {
      params: {
        kind: params.kind,
        date: params.date,
        // An empty string fails validation — omitted instead.
        search: params.search || undefined,
        has_report: params.hasReport,
        page: params.page,
        page_size: params.pageSize,
      },
    })
    const res = dailyReportsResponseSchema.parse(raw)
    return {
      items: (res.daily_reports ?? []).map(toRow),
      total: res.total ?? 0,
      page: res.page ?? params.page,
      pageSize: res.page_size ?? params.pageSize,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load the daily reports.')
  }
}

/**
 * GET /daily-reports/:id/:kind?date — one rep's report, scoped to the selected
 * company. A 404 carries `DAILY_REPORT_NOT_FOUND` (no such report that day) or
 * `SALES_INCHARGE_NOT_FOUND` (rep outside the selected company); the screen
 * renders both as states, so the code is kept on the thrown error.
 */
export async function fetchRepDailyReport(
  salesInchargeId: string,
  kind: DailyReportKind,
  date: string,
): Promise<RepDailyReport> {
  try {
    const raw = await http.get<unknown>(endpoints.DAILY_REPORT.DETAIL(salesInchargeId, kind), {
      params: { date },
    })
    return toRepReport(repDailyReportSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to load the daily report.')
  }
}
