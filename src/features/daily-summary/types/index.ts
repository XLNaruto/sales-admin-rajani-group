/** Domain types for the Daily Summary screen. */

/** What the backend decided the rep's day was. Never derived on the client. */
export type DailySummaryDayType =
  | 'retailing'
  | 'official_work'
  | 'absent'
  | 'leave'
  | 'holiday'
  | 'weekly_off'

/**
 * The tab filter's vocabulary — the day types plus `joint_working`, which is a
 * filter on `is_joint_working` rather than a day type of its own.
 */
export type DailySummaryTab = DailySummaryDayType | 'joint_working'

/** Sort columns the endpoint accepts. */
export type DailySummarySortBy =
  | 'sales_incharge_name'
  | 'employee_code'
  | 'log_in_at'
  | 'first_call_at'
  | 'tc'
  | 'pc'
  | 'productivity_percentage'
  | 'net_value'

export type SortOrder = 'asc' | 'desc'

export interface DailySummaryCounters {
  /** Planned outlets (calls scheduled). */
  sc: number
  /** Total calls = inTurn + ovt + to. */
  tc: number
  /** Planned outlets visited. */
  inTurn: number
  /** Out-of-turn visits (outlets not on the plan). */
  ovt: number
  /** Telephonic orders. */
  to: number
  /** Productive calls (subset of tc). */
  pc: number
  /** Out-of-compliance visits — not included in tc. */
  ovc: number
}

/** One rep's day. */
export interface DailySummary {
  salesInchargeId: string
  /** `yyyy-MM-dd` — the requested day. */
  date: string
  salesInchargeName: string
  employeeCode: string | null
  designationName: string | null
  dayType: DailySummaryDayType | null
  activityNames: string[]
  isJointWorking: boolean
  jointWorkingNames: string[]
  /** ISO-8601 UTC instants. */
  logInAt: string | null
  logOutAt: string | null
  /** Logged in, not yet logged out. */
  isDayOpen: boolean
  firstCallAt: string | null
  counters: DailySummaryCounters
  /** inTurn + ovt — tc without telephonic. */
  totalPhysicalCalls: number
  /** Already rounded to 2 decimals by the server. */
  productivityPercentage: number
  /** Primary (distributor) orders' net value, plain rupees. Primary-only by contract. */
  netValue: number
  primaryOrderCount: number
  /** Secondary (retailer) orders' net value, plain rupees. */
  secondaryNetValue: number
  secondaryOrderCount: number
  /** Order lines across the secondary orders. */
  secondaryLineCount: number
  beatIds: string[]
  beatNames: string[]
}

export interface DailySummaryParams {
  date: string
  stateId?: string
  type?: DailySummaryTab
  search?: string
  page: number
  pageSize: number
  sortBy?: DailySummarySortBy
  sortOrder?: SortOrder
}

export interface DailySummaryResult {
  items: DailySummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/* ------------------------------ Sales details ----------------------------- */

export type SalesDetailsCallType = 'in_turn' | 'out_of_turn' | 'telephonic'
export type SalesDetailsPartyType = 'retailer' | 'distributor'

/**
 * One row of Sales Details: a call (visit) with the orders booked in it,
 * summed. A zero-sale call still has a row. An order booked with no visit gets
 * a row of its own (`visitId: null`).
 */
export interface SalesDetailsRow {
  /** Stable key — the visit id, or the first order id for a visit-less order. */
  key: string
  visitId: string | null
  orderIds: string[]
  /** ISO-8601 UTC instant of the call (or of the order, when there is no visit). */
  at: string | null
  beatName: string | null
  partyType: SalesDetailsPartyType | null
  partyName: string | null
  callType: SalesDetailsCallType | null
  /** Out-of-turn visit. */
  isOvt: boolean
  isProductive: boolean
  /** Order quantity in pieces. */
  qty: number
  /** Order quantity in standard units (pieces ÷ the SKU's pieces-per-unit). */
  stdQty: number
  value: number
  discount: number
  netSales: number
}

export interface SalesDetailsTotals {
  qty: number
  stdQty: number
  value: number
  discount: number
  netSales: number
}

export interface SalesDetails {
  salesInchargeId: string
  salesInchargeName: string | null
  date: string
  /** Whole-day totals, whatever page is showing. */
  dayTotals: SalesDetailsTotals
  /** `yyyy-MM-dd` — the first day the month-to-date figures count from. */
  mtdFrom: string | null
  mtdNetSales: number
  mtdPrimaryNetSales: number
  mtdSecondaryNetSales: number
  /** This page of calls, in time order. */
  rows: SalesDetailsRow[]
  /** Calls on the day, across every page. */
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Sales Details filter, applied by the API. `visit` = visit-only rows;
 * `order` = order-only and visit + order rows.
 */
export type SalesDetailsFilter = 'all' | 'visit' | 'order'

export interface SalesDetailsParams {
  salesInchargeId: string
  date: string
  type: SalesDetailsFilter
  page: number
  pageSize: number
}
