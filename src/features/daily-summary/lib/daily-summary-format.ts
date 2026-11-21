/**
 * Pure helpers for the Daily Summary screen — no React, no API.
 */
import type { DailySummaryDayType, DailySummaryTab, SalesDetailsFilter } from '../types'

export const DAY_TYPE_LABEL: Record<DailySummaryDayType, string> = {
  retailing: 'Retailing',
  official_work: 'Official Work',
  absent: 'Absent',
  leave: 'Leave',
  holiday: 'Holiday',
  weekly_off: 'Weekly Off',
}

const DAY_TYPES = Object.keys(DAY_TYPE_LABEL) as DailySummaryDayType[]

/** Narrow a wire value to a known day type — null for anything unrecognised. */
export function toDayType(value: string | null | undefined): DailySummaryDayType | null {
  return DAY_TYPES.includes(value as DailySummaryDayType)
    ? (value as DailySummaryDayType)
    : null
}

/** Tabs in display order. `value: 'all'` is the absence of `type`. */
export const DAILY_SUMMARY_TABS: { value: DailySummaryTab | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'retailing', label: 'Retailing' },
  { value: 'joint_working', label: 'Manager JointWorking' },
  { value: 'official_work', label: 'Official Work' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'Leave' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'weekly_off', label: 'Weekly Off' },
]

export function isDailySummaryTab(value: unknown): value is DailySummaryTab {
  return DAILY_SUMMARY_TABS.some((tab) => tab.value !== 'all' && tab.value === value)
}

/**
 * Today as `yyyy-MM-dd` in IST. The server's "today" is IST, so the picker's
 * upper bound is too — whatever zone the browser happens to be in.
 */
export function todayIST(): string {
  // `en-CA` formats a date as `yyyy-MM-dd`.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

const TIME_IST = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

/** A UTC instant as an IST clock time (`10:52 AM`), or `''` when absent. */
export function timeIST(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : TIME_IST.format(date)
}

const LAKH = 100_000

const GROUPED = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 })
const LAKHS = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Net value in rupees, as FieldAssist shows it: Indian grouping with up to one
 * decimal below a lakh (`15,071.8`), lakhs to two decimals above (`1.52 Lac`).
 */
export function formatNetValue(rupees: number): string {
  if (!rupees) return '0'
  // Compared after rounding to one decimal, so 99,999.96 reads `1.00 Lac`
  // rather than `1,00,000`.
  if (Math.abs(Math.round(rupees * 10) / 10) >= LAKH) {
    return `${LAKHS.format(rupees / LAKH)} Lac`
  }
  return GROUPED.format(rupees)
}

const AMOUNT = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const QTY = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

/** Rupees in full, Indian grouping, two decimals (`1,52,340.50`). */
export function formatAmount(rupees: number): string {
  return AMOUNT.format(rupees)
}

/** A quantity — whole pieces, or standard units to at most two decimals. */
export function formatQty(qty: number): string {
  return QTY.format(qty)
}

/**
 * What a Sales Details row is. Calls aren't company-scoped but order money is,
 * so the order ids — never `isProductive`, which comes from the visit and
 * ignores the company — decide whether the row has an order.
 *
 * - `visit_and_order`: a visit with orders of the selected company booked on it.
 * - `visit_only`: a visit with no order in the selected company (there may be
 *   one under another company). Its figures are all zero by design.
 * - `order_only`: an order with no visit behind it (e.g. telephonic) — always
 *   exactly one order id.
 */
/** Sales Details filter chips, in display order. */
export const SALES_DETAILS_FILTERS: { value: SalesDetailsFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'visit', label: 'Visit' },
  { value: 'order', label: 'Order' },
]

export function isSalesDetailsFilter(value: unknown): value is SalesDetailsFilter {
  return SALES_DETAILS_FILTERS.some((f) => f.value === value)
}

export type SalesDetailsRowKind = 'visit_only' | 'order_only' | 'visit_and_order'

export function salesDetailsRowKind(row: {
  visitId: string | null
  orderIds: readonly string[]
}): SalesDetailsRowKind {
  const hasVisit = row.visitId !== null
  const hasOrder = row.orderIds.length > 0
  if (hasVisit && hasOrder) return 'visit_and_order'
  return hasVisit ? 'visit_only' : 'order_only'
}
