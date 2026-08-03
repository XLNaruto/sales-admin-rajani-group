/**
 * Journey Management domain types.
 *
 * A *journey plan* is one sales incharge's month of daily beat visits, produced
 * by the planning solver and then reviewed here before it goes live. These are
 * the camelCase shapes the screens work in; the wire is snake_case throughout
 * and the mapping lives in `api/` (never in a component).
 */

/**
 * Where a plan sits in its lifecycle — the server's enum, verbatim.
 *
 * There is deliberately no `sent_back`: the backend has no send-back state and
 * no endpoint for one. A re-solved plan lands in `superseded` and its successor
 * carries a new id.
 */
export type ApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'superseded'

/**
 * Machine code of an activity. Not a closed union — the activity master is
 * tenant-editable, so only the 12 seeded platform codes are predictable:
 * `retailing`, `joint_working`, `promotional`, `distributor_visit`,
 * `distributor_search`, `depot_visit`, `head_office_visit`, `meeting`,
 * `training`, `leave`, `holiday`, `weekly_off`.
 */
export type ActivityCode = string

/**
 * What kind of day this is — the rhythm strip's colour language. Derived from
 * the activity code, because *why* a day isn't worked matters (an unplanned
 * leave reads differently to a festival).
 */
export type DayKind = 'working' | 'weekly-off' | 'holiday' | 'leave'

/**
 * One row of the activity master. The three booleans are load-bearing — the
 * solver reads them and the API enforces their constraints — so they are
 * modelled rather than inferred from `code`.
 */
export interface ActivityDef {
  id: number
  code: ActivityCode
  name: string
  /** The day is meaningless without beats — picking this asks for beats. */
  requiresBeat: boolean
  /** Counts as a working day (leave / holiday / weekly off do not). */
  working: boolean
  /** Visits on this day count towards beat coverage. */
  coverage: boolean
  /** `true` for the seeded platform rows — no tenant may edit them. */
  platform: boolean
}

/* ─────────────────────────── approval queue (a month) ─────────────────────── */

/**
 * One calendar day in a queue row's rhythm strip — including non-working days,
 * in date order. `flagged` is its own overlay, not an activity value.
 */
export interface RhythmDay {
  /** ISO calendar date, `yyyy-MM-dd`. */
  date: string
  /** Day of month, 1-based — derived from `date`, never from a local `Date`. */
  day: number
  activityCode: ActivityCode | null
  /** Beats scheduled that day — the pillar's segment count. */
  beatCount: number
  flagged: boolean
}

/** One row of the approval queue: a sales incharge's plan for the month. */
export interface JourneyPlan {
  id: string
  inchargeId: string
  inchargeName: string
  employeeCode: string
  /** Territory the plan is anchored to (the `city` filter matches it exactly). */
  headquarter: string
  status: ApprovalStatus
  /** Share of the incharge's *allocated* beats the plan covers (0–100). */
  coverage: number
  workingDays: number
  /** Beat visits scheduled across the month. */
  beats: number
  /** Total flags, including any rolled-up remainder. */
  flagCount: number
  /** Why it's flagged, without opening it. */
  flagCodes: string[]
  rhythm: RhythmDay[]
}

/**
 * Roll-up of the queue, computed by the server over the WHOLE period — not the
 * page. Wire the stat cards and the tab badges to this, never to the row count,
 * or they change as the user pages.
 */
export interface QueueSummary {
  /** Every plan in the period, before any filter. */
  total: number
  avgCoverage: number
  clean: number
  needsLook: number
  approved: number
  /** Awaiting approval — the slice bulk-approve can act on. */
  pending: number
  /** Generated but not yet submitted for approval. */
  draft: number
  /** Share of the period already reviewed, as the server computes it. */
  reviewedPercentage: number
  /** When the batch was generated (ISO-8601 UTC). */
  generatedAt: string | null
}

/**
 * Filter choices, computed *before* filtering — so the panel never shrinks as
 * the user narrows, and never offers a city with nothing behind it.
 */
export interface QueueFilterOptions {
  cities: string[]
  flagCodes: string[]
}

/** One page of the queue. The period-wide roll-up is `QueuePeriodSummary`. */
export interface QueueResult {
  rows: JourneyPlan[]
  /** Rows matching the current filters — the table's `rowCount`. */
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * GET /journey-plans/summary — the period's counts and the filter panel's
 * options, in one payload. Fetched per period, refetched after an approve.
 */
export interface QueuePeriodSummary {
  summary: QueueSummary
  filterOptions: QueueFilterOptions
}

/** Which slice of the queue the segment control is showing. */
export type QueueSegment = 'all' | 'pending' | 'clean' | 'needs-look' | 'approved'

/** Server-side query for the queue. `periodMonth` is required (`yyyy-MM`). */
export interface QueueParams {
  periodMonth: string
  page?: number
  pageSize?: number
  /** Matches rep name OR employee code, case-insensitive. */
  search?: string
  status?: ApprovalStatus
  /** `true` = "Needs a look", `false` = "Clean". */
  hasFlags?: boolean
  city?: string
  flagCode?: string
  coverageMin?: number
  coverageMax?: number
  sortBy?: QueueSortBy
  sortOrder?: 'asc' | 'desc'
}

/** The four sortable columns. */
export type QueueSortBy = 'sales_incharge' | 'coverage' | 'working_days' | 'beats_scheduled'

/** Per-id outcome of a bulk approve — flagged plans are refused by design. */
export interface BulkApproveResult {
  approved: number
  skipped: number
  outcomes: {
    journeyPlanId: string
    outcome: 'approved' | 'skipped_flagged' | 'skipped_status' | 'not_found'
  }[]
}

/* ────────────────────────── plan detail (one month) ───────────────────────── */

/** A beat scheduled on a plan day. */
export interface PlanDayBeat {
  /** Id of the day-beat row (what a DELETE removes is keyed by `beatId`). */
  id: string
  beatId: string
  beatName: string
  workload: 'full_day' | 'half_day' | string
  /** `assigned` when it came from the rep's allocation. */
  source: string
  sequence: number
  /** Outlets on the beat — how much a missed visit actually costs. */
  stopCount: number
  /** The day has started; this beat is history and edits are refused. */
  locked: boolean
}

/**
 * The solver's reason for a day, structured rather than prose so it can be
 * re-rendered in another language later. Render `rule` to a phrase.
 */
export interface SolverReason {
  rule: string
  facts: Record<string, unknown>
}

/** One day of the plan — the row the day table renders and edits. */
export interface PlanDay {
  /** `journey_plan_days.id` — what the day-level PATCH is addressed to. */
  id: string
  /** ISO calendar date, `yyyy-MM-dd`. */
  date: string
  /** Day of month, 1-based — sliced off `date`, never read off a local `Date`. */
  day: number
  sequence: number
  activityId: number
  activityCode: ActivityCode
  activityName: string
  beats: PlanDayBeat[]
  jointWorkingInchargeId: string | null
  jointWorkingInchargeName: string | null
  /** Free-text note carried with the day (holiday name, leave reason, venue). */
  reason: string | null
  /** The day has started — it is history, and every edit returns 409. */
  locked: boolean
  lockedAt: string | null
  solverReason: SolverReason | null
}

/**
 * One thing the solver wants a human to look at. Server-computed and capped —
 * see `flagSummary` for the remainder.
 */
export interface PlanFlag {
  code: string
  /** `yyyy-MM-dd` when the flag points at a day. */
  date: string | null
  beatId: string | null
  beatName: string | null
  /** The EXPOSURE: outlets behind the flag, not just the fact of it. */
  outletCount: number | null
  facts: Record<string, unknown>
}

/**
 * The tail of `flags[]`, rolled up. The client cannot compute this itself — it
 * never received the beats it summarises.
 */
export interface PlanFlagSummary {
  remainingCount: number
  remainingBeatCount: number
  remainingOutletCount: number
}

/** How loudly a flag should read — derived from its code and facts. */
export type FlagSeverity = 'high' | 'medium' | 'low'

/** What kind of problem a flag is — rendered as the row's code chip. */
export type IssueCategory = 'activity' | 'coverage' | 'workload' | 'calendar'

/**
 * A server flag prepared for display: one row of the "Needs a look" panel. The
 * numbers come from the flag; only the wording is ours.
 */
export interface PlanIssue {
  code: string
  category: IssueCategory
  severity: FlagSeverity
  label: string
  /** Day of month the flag points at, when it is day-specific. */
  day?: number
  /** The rolled-up remainder — a summary of flags that were never sent. */
  rollup?: boolean
}

/** A sales incharge's full month, as opened from the approval queue. */
export interface JourneyPlanDetail {
  id: string
  inchargeId: string
  inchargeName: string
  employeeCode: string
  headquarter: string
  /** Month covered, as `yyyy-MM` (the API sends the 1st of the month). */
  month: string
  status: ApprovalStatus
  generatedAt: string | null
  /** Provenance — `solver`, `manual` or `import`. */
  generatedBy: string | null
  metrics: PlanMetrics
  flags: PlanFlag[]
  flagSummary: PlanFlagSummary | null
  /** TOTAL, including the rolled-up remainder — not `flags.length`. */
  flagCount: number
  days: PlanDay[]
}

/** The plan's headline numbers, exactly as the server computes them. */
export interface PlanMetrics {
  /** Against the rep's *allocated* beats, capped at 100. */
  coverage: number
  beatsScheduled: number
  workingDays: number
  totalDays: number
  plannedTravelKm: number | null
  /**
   * NULL ≠ 0. Null means the rep's beats carry no coordinates, so the travel
   * load is *unmeasurable* — render "—", never "0 km", which would read as an
   * excellent plan.
   */
  avgKmPerDay: number | null
}

/** One entry of the rep switcher — it already carries the plan id. */
export interface PlanRepOption {
  inchargeId: string
  inchargeName: string
  employeeCode: string
  journeyPlanId: string | null
  status: ApprovalStatus | null
}

/** What a re-solve changed, shown before the new month is committed to view. */
export interface ReSolveDiff {
  entries: {
    date: string
    removedBeatIds: string[]
    addedBeatIds: string[]
    activityChanged: boolean
  }[]
  daysChanged: number
  beatsMoved: number
  /** Includes locked days, which are held regardless of `pinnedDates`. */
  daysHeld: number
}

/** A re-solve supersedes the plan: `plan.id` is a NEW id. */
export interface ReSolveResult {
  plan: JourneyPlanDetail
  diff: ReSolveDiff
}

/** Per-rep outcome of a generation run. */
export interface GenerateResult {
  outcomes: {
    inchargeId: string
    outcome: 'created' | 'skipped_existing' | 'no_beats' | 'failed'
    journeyPlanId: string | null
  }[]
}

/** A beat allocated to the incharge — the pool the day's beat picker offers. */
export interface AllocatedBeat {
  id: string
  name: string
  /** Outlets on the beat, when the list carries them. */
  outlets: number | null
}

/* ────────────────── live day (one incharge's month, actual) ───────────────── */

/**
 * Did he work — a different question from *at what*, which `activityName`
 * answers. A plan can say Retailing on a day nobody worked.
 */
export type RepDayStatus =
  | 'worked'
  | 'official_work'
  | 'leave'
  | 'holiday'
  | 'weekly_off'
  | 'not_started'

/**
 * The numbers a field day is judged on, as the SFA reports them. Displayed, not
 * recomputed — these get compared against FieldAssist's figures on day one.
 *
 * `TC = in_turn + ovt + to`; `OVC` sits OUTSIDE that sum; `PC ⊂ TC`; `SC` counts
 * planned stops from ASSIGNED beats only (so it reads 0 on a day whose beat the
 * rep chose himself — correct, not a bug).
 */
export interface DayCounters {
  sc: number
  tc: number
  inTurn: number
  ovt: number
  to: number
  pc: number
  /** Always 0 today — the compliance evaluator is not built yet. */
  ovc: number
}

/** One day of the live month — the unit the day-card grid renders. */
export interface RepDaySummary {
  /** ISO calendar date, `yyyy-MM-dd`. */
  date: string
  /** Day of month, 1-based — sliced off `date`. */
  day: number
  status: RepDayStatus
  activityCode: ActivityCode | null
  activityName: string | null
  beatId: string | null
  beatName: string | null
  counters: DayCounters
  /** Metres travelled, chronologically. */
  distanceMetres: number
  /** Above 0 ⇒ the GPS-flagged badge. */
  mockSuspectedCount: number
  /** ISO-8601 UTC, or null when the day never started. */
  dayStartAt: string | null
  dayEndAt: string | null
  /** Attendance stores no address — null is expected, not a bug. */
  dayStartAddress: string | null
}

/** The live month's roll-up, computed by the server over the whole range. */
export interface LiveMonthTotals {
  days: number
  daysOnField: number
  offDays: number
  gpsFlaggedDays: number
  totalCalls: number
  productiveCalls: number
  productivityPercentage: number
  /** Divides by days ON FIELD, not calendar days — do not recompute it. */
  avgCallsPerDay: number
  distanceMetres: number
}

/** A window of field days plus its totals. */
export interface LiveMonthResult {
  days: RepDaySummary[]
  totals: LiveMonthTotals
}

/** Which slice of the month the day grid is showing. */
export type DayScope = 'all' | 'on-field' | 'off'

/** A GPS position. Parsed to numbers only here, at the map's boundary. */
export interface GeoPoint {
  lat: number
  lng: number
}

/**
 * What kind of call it was. `TC` is `in-turn + ovt + to`, so the kinds are not a
 * partition of the day's calls — the facets are what the chips count.
 */
export type VisitKind =
  | 'in-turn'
  | 'telephonic'
  | 'ovt'
  | 'ovc'
  | 'joint-working'
  | 'distributor'
  | 'official-work'

/** One punched call, in chronological order. */
export interface DayVisit {
  id: string
  /** Chronological position in the day — the timeline's numbering. */
  daySequence: number
  /** Punch time as `HH:mm` in IST, derived from the ISO timestamp. */
  at: string | null
  outlet: string
  beatName: string | null
  kind: VisitKind
  productive: boolean
  /** Always null today — the orders module is not built yet. */
  orderValue: string | null
  /** Seconds inside the outlet's geofence. */
  dwellSeconds: number | null
  reason: string | null
  /** Null for a call with no fix (e.g. telephonic) — such a call has no pin. */
  point: GeoPoint | null
}

/** A call that carries a fix, so it can be drawn. */
export type VisitMarker = DayVisit & { point: GeoPoint }

/** A planned stop the day never reached — a map marker, not just a list row. */
export interface ScheduledOutlet {
  id: string
  name: string
  stopType: string
  plannedSequence: number | null
  point: GeoPoint | null
}

/** A miss that carries a fix. */
export type OutletMarker = ScheduledOutlet & { point: GeoPoint }

/**
 * The day's route — a *reconstruction*, not a GPS trail. No breadcrumb track is
 * stored anywhere; what exists is one fix per visit, so this is the shortest
 * walk through those fixes anchored at the rep's day-start coordinate.
 */
export interface DayRoute {
  /** `false` ⇒ draw markers and NO line. `state` says why. */
  drawable: boolean
  /** `ok` | `no_day_start` | `no_mapped_points` — surface it in the UI. */
  state: string
  origin: GeoPoint | null
  /** Optimised distance — differs from the chronological total by the backtracking. */
  distanceMetres: number | null
  /** Ordered by `sequence` (the optimised order), NOT by `daySequence`. */
  points: VisitMarker[]
}

/** Attendance for the day. Entirely null when the phone never checked in. */
export interface DayAttendance {
  dayStartAt: string | null
  dayEndAt: string | null
  /** Check-in → check-out INCLUDING breaks — the "On field" figure. */
  elapsedSeconds: number | null
  /** The same span MINUS breaks. A different number; never present it as the same. */
  workingSeconds: number | null
  breakSeconds: number | null
  sessionCount: number | null
  checkIn: GeoPoint | null
  /** Where the day was punched out. Null until the rep ends the day. */
  checkOut: GeoPoint | null
  dayStartAddress: string | null
  dayEndAddress: string | null
}

/** The nine numbers behind the nine legend chips. */
export interface DayFacets {
  inTurn: number
  telephonic: number
  ovt: number
  ovc: number
  jointWorking: number
  notVisited: number
  distributor: number
  officialWork: number
  productive: number
}

/** One field day in full — the Live Day screen's whole payload. */
export interface LiveDayDetail {
  date: string
  status: RepDayStatus
  counters: DayCounters
  /** What the plan asked for. */
  assignedBeat: { id: string; name: string } | null
  /** What the rep actually worked — a difference from `assignedBeat` is a deviation. */
  selectedBeat: { id: string; name: string } | null
  /** Chronological distance — differs from `route.distanceMetres` by backtracking. */
  totalDistanceMetres: number
  mockSuspectedCount: number
  attendance: DayAttendance
  timeline: DayVisit[]
  route: DayRoute
  notVisited: ScheduledOutlet[]
  facets: DayFacets
}

/**
 * What the day-trail map is showing. `all` is every marker; a `VisitKind`
 * narrows to calls of that kind; `not-visited` shows the planned stops that were
 * never reached (which are not calls at all); `productive` cuts across the kinds.
 */
export type TrailFilter = 'all' | VisitKind | 'not-visited' | 'productive'

/* ──────────────────────────── the AI agent ────────────────────────────────── */

/**
 * One turn of the agent transcript. `content` is a raw array of Anthropic
 * content blocks, passed through rather than flattened, so tool activity can be
 * rendered differently from prose.
 */
export interface AgentMessage {
  id: number
  role: 'user' | 'assistant' | 'tool_result'
  content: AgentContentBlock[]
  /** Non-null marks a failed turn — render it as an error, not a gap. */
  error: string | null
  createdAt: string | null
}

/** The block kinds we render: text as prose, `tool_use` as an activity row. */
export interface AgentContentBlock {
  type: string
  text?: string
  name?: string
  input?: unknown
  [key: string]: unknown
}

/** The conversation for one (sales incharge, period) — not for one plan id. */
export interface AgentConversation {
  conversationId: number
  journeyPlanId: string
  periodMonth: string
  inchargeId: string
  /** Socket room to join. Never guess it — this is where it comes from. */
  room: string
  /** Event name every agent frame arrives under. */
  event: string
  /** `false` ⇒ Bedrock is not configured here; disable the composer up front. */
  enabled: boolean
  messages: AgentMessage[]
}

/** A frame of the agent stream, discriminated by `type`. */
export type AgentStreamEvent =
  | { type: 'turn_started'; conversation_id: number; user_message_id: number }
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_started' }
  | { type: 'tool_started'; name: string; input?: unknown }
  | { type: 'tool_finished'; name: string; ok: boolean; summary?: string }
  | { type: 'plan_changed'; journey_plan_id: number; reason?: string }
  | {
      type: 'turn_finished'
      assistant_message_id: number
      stop_reason?: string | null
      usage?: unknown
    }
  | { type: 'turn_failed'; message: string }

/** One row of the agent panel's activity log. */
export interface ToolActivity {
  kind: 'thinking' | 'tool'
  name?: string
  input?: unknown
  running: boolean
  ok?: boolean
  summary?: string
}
