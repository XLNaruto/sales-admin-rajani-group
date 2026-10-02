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
  /** Plain rupees, unformatted. */
  netValue: number
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
