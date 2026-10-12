/**
 * Domain types for the Daily Reports screens.
 *
 * Every figure here is the backend's — the client only formats it. Target,
 * Retailing and Order to Company are the selected company's; the counters and
 * remarks are the rep's whole window, since a visit belongs to no company.
 */

/** Morning: first check-in → 12:00 PM IST. Evening: first check-in → check-out. */
export type DailyReportKind = 'morning' | 'evening'

/** The list's status filter. `all` is the absence of `has_report`. */
export type DailyReportStatusFilter = 'all' | 'reported' | 'not_reported'

export interface DailyReportPack {
  /** Bulk-pack name, e.g. "Dozen", "Bandha". */
  name: string
  quantity: number
}

/** One figure in every unit a division might report in. */
export interface DailyReportMeasures {
  /** Plain rupees, unformatted. */
  amount: number
  kg: number
  pieces: number
  /** Sorted by name by the server; may be empty. */
  packs: DailyReportPack[]
}

export interface DailyReportCounters {
  /** Scheduled calls — outlets planned for the day. Same morning and evening. */
  sc: number
  /** Total calls — visits in the window. */
  tc: number
  /** Productive calls — visits that took an order. */
  pc: number
  /** New counters — retailers onboarded in the window. */
  nc: number
}

/** A named reference: a centre (city), market route (beat) or deal person (distributor). */
export interface DailyReportRef {
  id: string
  name: string
}

/** The report as the list shows it — `null` on the row when the rep has none. */
export interface DailyReportSummary {
  centres: DailyReportRef[]
  marketRoutes: DailyReportRef[]
  dealPersons: DailyReportRef[]
  /** ISO-8601 UTC — the day's first check-in. */
  startTime: string
  /** Morning: 12:00 PM IST. Evening: check-out, `null` while still open. */
  closeTime: string | null
  /** False while the window is still running. */
  isClosed: boolean
  target: DailyReportMeasures
  retailing: DailyReportMeasures
  orderToCompany: DailyReportMeasures
  counters: DailyReportCounters
}

export interface DailyReportRow {
  salesInchargeId: string
  salesInchargeName: string
  employeeCode: string | null
  kind: DailyReportKind
  /** `yyyy-MM-dd`, IST. */
  date: string
  report: DailyReportSummary | null
}

export interface DailyReportsParams {
  kind: DailyReportKind
  date: string
  search?: string
  /** `true` = only reps with this report, `false` = only reps without. */
  hasReport?: boolean
  page: number
  pageSize: number
}

export interface DailyReportsResult {
  items: DailyReportRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type NoOrderReason =
  | 'shop_closed'
  | 'stock_unavailable'
  | 'owner_absent'
  | 'payment_issue'
  | 'other'

/** One company's figures. The admin view always carries exactly one: the selected company. */
export interface DailyReportDivision {
  companyId: string
  companyName: string
  target: DailyReportMeasures
  retailing: DailyReportMeasures
  orderToCompany: DailyReportMeasures
}

export interface DailyReportRemark {
  visitId: string
  partyType: 'retailer' | 'distributor'
  partyId: string
  partyName: string | null
  checkInAt: string | null
  /**
   * Typed text — or, when `isNotesInAudio`, an S3 object key that must never be
   * rendered.
   */
  notes: string | null
  isNotesInAudio: boolean
  description: string | null
  noOrderReason: NoOrderReason | null
}

/** One rep's report in full. */
export interface RepDailyReport {
  salesInchargeId: string
  salesInchargeName: string
  employeeCode: string | null
  kind: DailyReportKind
  date: string
  centres: DailyReportRef[]
  marketRoutes: DailyReportRef[]
  dealPersons: DailyReportRef[]
  startTime: string
  closeTime: string | null
  isClosed: boolean
  divisions: DailyReportDivision[]
  counters: DailyReportCounters
  /** In check-in order; may be empty. */
  remarks: DailyReportRemark[]
}
