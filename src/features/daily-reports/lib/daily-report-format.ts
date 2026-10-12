/**
 * Pure helpers for the Daily Reports screens — no React, no API.
 *
 * Display only: nothing here re-aggregates a figure. The one derived number is
 * the optional PC / TC productivity, which the brief allows.
 */
import { format, parseISO } from 'date-fns'
import type {
  DailyReportCounters,
  DailyReportDivision,
  DailyReportKind,
  DailyReportRef,
  DailyReportStatusFilter,
  NoOrderReason,
} from '../types'

export const KIND_LABEL: Record<DailyReportKind, string> = {
  morning: 'Morning',
  evening: 'Evening',
}

/** Tabs in display order. Evening first: it covers the whole day. */
export const DAILY_REPORT_KINDS: { value: DailyReportKind; label: string }[] = [
  { value: 'evening', label: 'Evening' },
  { value: 'morning', label: 'Morning' },
]

export function isDailyReportKind(value: unknown): value is DailyReportKind {
  return value === 'morning' || value === 'evening'
}

export const STATUS_FILTER_OPTIONS: { value: DailyReportStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'reported', label: 'Reported' },
  { value: 'not_reported', label: 'Not reported' },
]

export function isStatusFilter(value: unknown): value is DailyReportStatusFilter {
  return STATUS_FILTER_OPTIONS.some((option) => option.value === value)
}

/** The status filter as the endpoint's `has_report` — `undefined` for All. */
export function toHasReport(status: DailyReportStatusFilter): boolean | undefined {
  if (status === 'reported') return true
  if (status === 'not_reported') return false
  return undefined
}

/**
 * What a rep without a report is called. A missing morning report may just
 * mean a first check-in after noon, so it isn't called "Not reported".
 */
export function noReportLabel(kind: DailyReportKind): string {
  return kind === 'morning' ? 'No morning report' : 'Not reported'
}

export const NO_ORDER_REASON_LABEL: Record<NoOrderReason, string> = {
  shop_closed: 'Shop closed',
  stock_unavailable: 'Stock unavailable',
  owner_absent: 'Owner absent',
  payment_issue: 'Payment issue',
  other: 'Other',
}

/** Narrow a wire value to a known reason; anything unrecognised reads as Other. */
export function toNoOrderReason(value: string | null | undefined): NoOrderReason | null {
  if (!value) return null
  return value in NO_ORDER_REASON_LABEL ? (value as NoOrderReason) : 'other'
}

const RUPEES = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Rupees with Indian grouping: `₹1,31,100.50`. */
export function formatRupees(amount: number): string {
  return RUPEES.format(amount)
}

const QUANTITY = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

/** A kg / pieces / pack quantity with Indian grouping and up to two decimals. */
export function formatQuantity(value: number): string {
  return QUANTITY.format(value)
}

export function formatKg(kg: number): string {
  return `${QUANTITY.format(kg)} kg`
}

/** Names of a list of refs, joined — empty string when there are none. */
export function joinNames(refs: DailyReportRef[], separator: string): string {
  return refs.map((ref) => ref.name).join(separator)
}

/** A `yyyy-MM-dd` day as "Mon, 04 Aug 2026" — date-only, so no UTC shift. */
export function reportDateLabel(date: string): string {
  try {
    return format(parseISO(date), 'EEE, dd MMM yyyy')
  } catch {
    return date
  }
}

/** PC / TC as a percentage to one decimal, or `null` when there were no calls. */
export function productivity(counters: DailyReportCounters): number | null {
  if (!counters.tc) return null
  return Math.round((counters.pc / counters.tc) * 1000) / 10
}

/** One row of the division's measures table. */
export interface MeasureRow {
  key: string
  label: string
  target: string
  retailing: string
  orderToCompany: string
}

/**
 * The division's measures as table rows: Amount, then Kg and Pieces (each
 * dropped when zero in all three columns), then one row per pack name across
 * the union of the three — a pack missing from a column reads as 0.
 */
export function measureRows(division: DailyReportDivision): MeasureRow[] {
  const columns = [division.target, division.retailing, division.orderToCompany]
  const rows: MeasureRow[] = [
    {
      key: 'amount',
      label: 'Amount ₹',
      target: formatRupees(division.target.amount),
      retailing: formatRupees(division.retailing.amount),
      orderToCompany: formatRupees(division.orderToCompany.amount),
    },
  ]

  if (columns.some((measures) => measures.kg !== 0)) {
    rows.push({
      key: 'kg',
      label: 'Kg',
      target: formatQuantity(division.target.kg),
      retailing: formatQuantity(division.retailing.kg),
      orderToCompany: formatQuantity(division.orderToCompany.kg),
    })
  }
  if (columns.some((measures) => measures.pieces !== 0)) {
    rows.push({
      key: 'pieces',
      label: 'Pieces',
      target: formatQuantity(division.target.pieces),
      retailing: formatQuantity(division.retailing.pieces),
      orderToCompany: formatQuantity(division.orderToCompany.pieces),
    })
  }

  const packNames = [
    ...new Set(columns.flatMap((measures) => measures.packs.map((pack) => pack.name))),
  ].sort((a, b) => a.localeCompare(b))
  const packQuantity = (packs: { name: string; quantity: number }[], name: string) =>
    formatQuantity(packs.find((pack) => pack.name === name)?.quantity ?? 0)

  for (const name of packNames) {
    rows.push({
      key: `pack:${name}`,
      label: name,
      target: packQuantity(division.target.packs, name),
      retailing: packQuantity(division.retailing.packs, name),
      orderToCompany: packQuantity(division.orderToCompany.packs, name),
    })
  }
  return rows
}
