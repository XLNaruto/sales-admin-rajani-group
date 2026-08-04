/**
 * Journey Management domain types.
 *
 * A *journey plan* is one sales incharge's **allocation for a month** — which of
 * his beats are in play, plus the handful of dates the office fixes for everyone.
 * It is deliberately **not a calendar**: the rep writes a day row each morning
 * when he picks his activity and then his beat, so most dates in a future month
 * have no entry at all and that is the normal state.
 *
 * These are the camelCase shapes the screens work in; the wire is snake_case
 * throughout and the mapping lives in `api/` (never in a component).
 *
 * There is no approval lifecycle. An allocation is live the moment it exists —
 * no `status`, no approve, no re-solve, no day-level admin edit. The whole admin
 * write surface is `PATCH /journey-plans/:id { beats, pinned_days }`.
 */

/**
 * Machine code of an activity. Not a closed union — the activity master is
 * tenant-editable, so only the 12 seeded platform codes are predictable:
 * `retailing`, `joint_working`, `promotional`, `distributor_visit`,
 * `distributor_search`, `depot_visit`, `head_office_visit`, `meeting`,
 * `training`, `leave`, `holiday`, `weekly_off`.
 */
export type ActivityCode = string

/**
 * What kind of day an activity code makes. Used only as the *fallback* when a
 * screen has a code but no master row to read the booleans off.
 */
export type DayKind = 'working' | 'weekly-off' | 'holiday' | 'leave'

/**
 * One row of the activity master. The three booleans are load-bearing — the API
 * enforces their constraints — so they are modelled rather than inferred from
 * `code`.
 */
export interface ActivityDef {
  id: number
  code: ActivityCode
  name: string
  /** The day is meaningless without beats — picking this asks the rep for one. */
  requiresBeat: boolean
  /** Counts as a working day (leave / holiday / weekly off do not). */
  working: boolean
  /** Visits on this day count towards beat progress. */
  coverage: boolean
  /** `true` for the seeded platform rows — no tenant may edit them. */
  platform: boolean
}

/* ──────────────────────────── the month strip ─────────────────────────────── */

/**
 * The server's verdict on a calendar date, **derived at read time**. The single
 * most important field on the allocation screens.
 *
 * `absent` and `holiday` must never collapse into one "off" state: a rep who
 * skipped six days must not read identically to one who had six holidays. And
 * `unplanned` on a future date is **not** a problem — nothing to badge.
 */
export type DayLabel =
  /** A past date the rep chose an activity for. */
  | 'worked'
  /** Today or later, activity already set (pinned, or chosen this morning). */
  | 'planned'
  /** A day row whose activity is not a working day. */
  | 'holiday'
  /** A past date with **no entry at all** — nobody said anything, nobody worked. */
  | 'absent'
  /** Today or later, nothing chosen yet. */
  | 'unplanned'

/** Who put the day row there. `null` when no row exists for the date. */
export type DayOrigin =
  /** The office fixed this date and the rep has not overridden it. */
  | 'pinned'
  /** The rep's own choice. */
  | 'rep'

/**
 * One entry per calendar date of the month. **Draw the calendar from this, never
 * from `days`** — `days` holds only the rows that exist.
 */
export interface MonthStripDay {
  /** ISO calendar date, `yyyy-MM-dd`. */
  date: string
  /** Day of month, 1-based — derived from `date`, never from a local `Date`. */
  day: number
  label: DayLabel
  activityCode: ActivityCode | null
  origin: DayOrigin | null
  /** Beats on the day — 0 on most dates, including every unplanned one. */
  beatCount: number
}

/* ─────────────────────────────── the flags ────────────────────────────────── */

/**
 * The four warnings the server raises. They **gate nothing**: there is no
 * approval step, so an allocation with flags is as live as one without. Render a
 * marker, never a blocking state.
 */
export type PlanFlagCode =
  /** The month's beat list is empty — the rep has nothing to work. */
  | 'no_beats_allocated'
  /** A listed beat is no longer allocated to this rep. */
  | 'beat_not_allocated'
  /** More beats listed than working days. `facts: { allocated, capacity, excess }`. */
  | 'over_capacity'
  /** A pinned date carries a non-working activity. Usually deliberate. */
  | 'pinned_on_non_working_day'

/** One warning, most severe first as the server sends them. */
export interface PlanFlag {
  code: string
  /** `yyyy-MM-dd` when the flag points at a date. */
  date: string | null
  beatId: string | null
  /** Null for `beat_not_allocated` — no beat row survives to read a name from. */
  beatName: string | null
  /** The EXPOSURE: outlets behind the flag, not just the fact of it. */
  outletCount: number | null
  facts: Record<string, unknown>
}

/** How loudly a flag should read — derived from its code and facts. */
export type FlagSeverity = 'high' | 'medium' | 'low'

/** What kind of problem a flag is — rendered as the row's chip. */
export type IssueCategory = 'allocation' | 'capacity' | 'calendar'

/** A server flag prepared for display. The numbers are the server's. */
export interface PlanIssue {
  code: string
  category: IssueCategory
  severity: FlagSeverity
  label: string
  /** Day of month the flag points at, when it is date-specific. */
  day?: number
}

/* ─────────────────────────── the list (a month) ───────────────────────────── */

/**
 * One row of the allocation list: a sales incharge's month.
 *
 * **There is no status and there are no flag filters** — nothing here has a
 * lifecycle to filter by. For a worklist, sort by `completion` ascending or scan
 * the `flags`.
 */
export interface JourneyPlan {
  id: string
  inchargeId: string
  inchargeName: string
  employeeCode: string
  /** Territory the rep is anchored to (the `city` filter matches it exactly). */
  headquarter: string
  /** Beats on the month's list — the plan. */
  beatsAllocated: number
  /** Distinct **listed** beats worked at least once — the actual. */
  beatsWorked: number
  /**
   * `beatsWorked / beatsAllocated`, 0–100. **Zero when nothing is allocated**,
   * not 100: a rep with no beats has not finished his month, he was never given
   * one, and that is itself a flag.
   */
  completion: number
  /** Dates so far whose activity is a working day. */
  workingDays: number
  flags: PlanFlag[]
  /** One entry per calendar date. */
  monthStrip: MonthStripDay[]
}

/** Which column the list is sorted by, server-side. */
export type QueueSortBy = 'sales_incharge' | 'completion' | 'beats_allocated' | 'beats_worked'

/** Server-side query for the list. `periodMonth` is required (`yyyy-MM`). */
export interface QueueParams {
  periodMonth: string
  page?: number
  pageSize?: number
  /** Matches rep name OR employee code, case-insensitive. */
  search?: string
  /** Exact match on the rep's territory. */
  city?: string
  sortBy?: QueueSortBy
  sortOrder?: 'asc' | 'desc'
}

/** One page of the list. */
export interface QueueResult {
  rows: JourneyPlan[]
  /** Rows matching the current filters — the table's `rowCount`. */
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/* ────────────────────── the allocation (one rep's month) ──────────────────── */

/**
 * One beat on the month's list.
 *
 * **There is no per-beat target.** Do not render `workedCount` as `2 / 3`: the
 * allocation carries no count, and `visitsPerMonth` is the beat's general cycle,
 * not a target for this month.
 */
export interface AllocatedPlanBeat {
  beatId: string
  beatName: string
  /** `solver` — proposed by the picker at generate. `manual` — the admin's. */
  source: 'solver' | 'manual'
  /** Outlets on the beat — how much skipping it actually costs. */
  outletCount: number | null
  /** The beat's general visit cycle. NOT a target for this month. */
  visitsPerMonth: number | null
  /** Times worked so far this month. */
  workedCount: number
  /** Strings on the wire so precision survives — parse, never assume float. */
  latitude: string | null
  longitude: string | null
}

/** A beat the rep took on a day. */
export interface PlanDayBeat {
  /** Id of the day-beat row. */
  id: string
  beatId: string
  beatName: string
  /** "Best available" order — planned once the day started, advisory before. */
  sequence: number
  /** Outlets snapshotted when he picked the beat. */
  stopCount: number
  /** A visit landed on it; it is history. */
  locked: boolean
}

/**
 * One day row that **exists** — a pinned date, or a date the rep has already
 * chosen. Most of a future month has none.
 */
export interface PlanDay {
  id: string
  /** ISO calendar date, `yyyy-MM-dd`. */
  date: string
  /** Day of month, 1-based — sliced off `date`, never read off a local `Date`. */
  day: number
  activityId: number
  activityCode: ActivityCode
  activityName: string
  origin: DayOrigin
  /** When the rep chose it. Null on a pinned date he has not touched. */
  selectedAt: string | null
  beats: PlanDayBeat[]
  jointWorkingInchargeId: string | null
  jointWorkingInchargeName: string | null
  /** Free-text note carried with the day (holiday name, leave reason, venue). */
  reason: string | null
  /** A visit landed on it — the server refuses to move it. */
  locked: boolean
  lockedAt: string | null
}

/**
 * The month's progress, exactly as the server computes it. Nothing here is
 * recomputed on the client.
 */
export interface PlanProgress {
  beatsAllocated: number
  beatsWorked: number
  beatsRemaining: number
  /** 0–100. Zero — not 100 — when nothing is allocated. */
  completion: number
  workingDays: number
  /**
   * Dates available to work a beat: the month's days minus the pinned ones.
   * **Weekly offs are not subtracted** unless the admin pinned them, because
   * nothing knows which day a given rep is off. It feeds only the
   * `over_capacity` warning — never display it as a hard number of free days.
   */
  capacity: number
  totalDays: number
}

/** A sales incharge's month in full, as opened from the list. */
export interface JourneyPlanDetail {
  id: string
  inchargeId: string
  inchargeName: string
  employeeCode: string
  headquarter: string
  /** Month covered, as `yyyy-MM` (the API sends the 1st of the month). */
  month: string
  generatedAt: string | null
  /** Provenance — `solver`, `manual` or `import`. */
  generatedBy: string | null
  /** THE ALLOCATION: which beats are in play this month. */
  allocatedBeats: AllocatedPlanBeat[]
  progress: PlanProgress
  flags: PlanFlag[]
  /** One entry per calendar date — draw the calendar from this. */
  monthStrip: MonthStripDay[]
  /** Only the rows that exist. Short on a fresh month, and that is correct. */
  days: PlanDay[]
}

/** One date the office fixes, as the save body carries it. */
export interface PinnedDay {
  /** `yyyy-MM-dd`, inside the period. */
  date: string
  activityId: number
}

/**
 * The save body. Both fields are **full replacements** of what they cover, not
 * deltas — send the whole list. An omitted field is left alone.
 */
export interface SavePlanInput {
  /** Beat ids. A beat not allocated to the rep is refused with a 400. */
  beats?: string[]
  pinnedDays?: PinnedDay[]
}

/** One entry of the rep switcher — it already carries the plan id. */
export interface PlanRepOption {
  inchargeId: string
  inchargeName: string
  employeeCode: string
  journeyPlanId: string
}

/* ───────────────────────────── generate a month ───────────────────────────── */

/** What happened to one rep in a generation run. */
export type GenerateOutcome =
  | 'created'
  | 'replaced'
  | 'skipped_existing'
  | 'no_beats'
  | 'failed'

/** What a run asks for. `pinnedDays` applies to EVERY rep in the run. */
export interface GenerateInput {
  periodMonth: string
  /** Omit for every rep in the caller's scope. */
  inchargeIds?: string[]
  /** Pinning the weekly offs here is what makes `capacity` accurate. */
  pinnedDays?: PinnedDay[]
  /** Generation skips a rep who already has an allocation unless this is set. */
  replaceExisting?: boolean
  seed?: string
}

/**
 * Per-rep outcomes plus the run's totals. **One rep's failure does not fail the
 * run** — render the list, never treat a non-zero `failed` as a whole-run error.
 */
export interface GenerateResult {
  results: {
    inchargeId: string
    outcome: GenerateOutcome
    journeyPlanId: string | null
    beatsAllocated: number
    /** Why it failed or was skipped, when the server says.  */
    message: string | null
  }[]
  created: number
  skipped: number
  failed: number
}

/** A beat allocated to the incharge — the pool the month's beat list draws from. */
export interface AllocatedBeat {
  id: string
  name: string
  /** Outlets on the beat, when the list carries them. */
  outlets: number | null
}

/* ────────────────── live day (one incharge's month, actual) ───────────────── */

/**
 * Did he work — a different question from *at what*, which `activityName`
 * answers.
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
 * `TC = in_turn + ovt + to`; `OVC` sits OUTSIDE that sum; `PC ⊂ TC`. **`SC` now
 * counts the stops snapshotted for the day's beat** — the calls he set out to
 * make. It previously counted admin-assigned beats only, and nothing assigns
 * beats to dates any more, so that rule would zero it every day.
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
  /** Optimised distance — differs from the chronological total by backtracking. */
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
  /**
   * Where the day was punched out. **Null while the session is still open** — a
   * different null from "no attendance for the day", where every field is null.
   */
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
  /**
   * The beats he worked, **in the order he took them**. Replaces the old
   * `assignedBeat` / `selectedBeat` pair: nothing assigns beats to dates now, so
   * every beat here is the rep's own choice.
   */
  beats: { id: string; name: string }[]
  /**
   * Were those beats on the month's list? `false` is a deviation — it did not
   * block the pick. **`true` on a day with no beats at all.**
   */
  onAllocation: boolean
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

/**
 * A frame of the agent stream, discriminated by `type`.
 *
 * `plan_changed` no longer means "superseded" — nothing mints a new plan id any
 * more, so it is a signal to refetch the allocation on screen.
 */
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
