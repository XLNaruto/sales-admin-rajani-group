/**
 * Journey Management domain types.
 *
 * A *journey plan* is a **negotiation between the sales admin and one sales incharge, for
 * one month**. The admin allocates **counts** — "one meeting day, four weekly
 * offs, twenty days in Rajkot" — and never a date or a beat. The sales incharge dates every
 * allocated day and picks the beats, then hands it back. The admin signs off, and
 * may still correct the calendar afterwards because a live month has to be
 * fixable.
 *
 * Four states, one direction only, with no reject and no send-back:
 * `draft → published → submitted → approved`.
 *
 * These are the camelCase shapes the screens work in; the wire is snake_case
 * throughout and the mapping lives in `api/` (never in a component).
 */

/* ──────────────────────────── the lifecycle ───────────────────────────────── */

/**
 * Where a plan sits in the chain. Sorting by it uses **chain order**, not
 * alphabetical — `PLAN_STATUS_CHAIN` in `lib/plan-status` is the order.
 *
 * - `draft` — the admin's allocation. **The sales incharge cannot see it at all.**
 * - `published` — released; the sales incharge is dating the month.
 * - `submitted` — handed back. The sales incharge is read-only from here, permanently.
 * - `approved` — signed off. The admin may still correct the calendar.
 */
export type PlanStatus = 'draft' | 'published' | 'submitted' | 'approved'

/** How the plan's allocation came about. */
export type PlanSource = 'solver' | 'manual' | 'import'

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
  /** The day is meaningless without beats — such a day needs a city AND beats. */
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
 * most important field on the plan screens.
 *
 * `missed` and `holiday` must never collapse into one "off" state: a sales incharge who
 * skipped six days must not read identically to one who had six holidays. And
 * whether `unscheduled` is a problem **depends on the plan's status** — it is the
 * normal state of a draft and of a freshly published month, so read it off the
 * plan, never off the strip.
 */
export type DayLabel =
  /** Scheduled, and a visit landed on it. */
  | 'worked'
  /** Scheduled, still ahead (or today) and not yet worked. */
  | 'planned'
  /** Scheduled with an activity whose `is_working_day` is false. */
  | 'holiday'
  /** Scheduled, **past**, and nothing was ever recorded. */
  | 'missed'
  /** No day row. Normal on a draft or a freshly published plan. */
  | 'unscheduled'

/**
 * Who wrote the day row. `null` when no row exists for the date.
 *
 * `admin` marks an **admin correction** — it is how the screen shows where the
 * approved calendar differs from what the sales incharge handed over.
 */
export type DayOrigin = 'rep' | 'admin'

/**
 * One entry per calendar date of the month. **Draw the calendar from this, never
 * from `days`** — `days` is empty on a draft and on a freshly published plan.
 */
export interface MonthStripDay {
  /** ISO calendar date, `yyyy-MM-dd`. */
  date: string
  /** Day of month, 1-based — derived from `date`, never from a local `Date`. */
  day: number
  label: DayLabel
  activityCode: ActivityCode | null
  /** The city the date sits in, when its activity takes beats. */
  cityId: string | null
  origin: DayOrigin | null
  /** Beats on the day — 0 on every unscheduled date and on beatless activities. */
  beatCount: number
}

/* ─────────────────────────────── the flags ────────────────────────────────── */

/**
 * The eight warnings the server raises, computed and never stored. Two of them
 * **mirror a refusal** and so genuinely gate a transition:
 * `allocation_incomplete` blocks publish, and `schedule_unallocated` /
 * `schedule_mismatch` block approve. The rest are advisory.
 */
export type PlanFlagCode =
  /** Nothing allocated — publish will fail too. */
  | 'no_cities_allocated'
  /** The counts do not account for the whole month. **Blocks publish.** */
  | 'allocation_incomplete'
  /** A scheduled date falls outside every bucket. **Blocks approve.** */
  | 'schedule_unallocated'
  /** A bucket's scheduled days do not match its count. **Blocks approve.** */
  | 'schedule_mismatch'
  /** The sales incharge no longer holds beats in an allocated city. */
  | 'city_without_beats'
  /** A scheduled beat does not sit in its day's city — the beat master drifted. */
  | 'beat_outside_city'
  /** A scheduled activity is not admin-allocatable (field selling never is). */
  | 'activity_not_allocatable'
  /** Published, and the sales incharge has not started dating the month. */
  | 'awaiting_schedule'

/** One warning, most severe first as the server sends them. */
export interface PlanFlag {
  code: string
  /** `yyyy-MM-dd` when the flag points at a date. */
  date: string | null
  cityId: string | null
  cityName: string | null
  activityId: number | null
  activityName: string | null
  beatId: string | null
  beatName: string | null
  /** The numbers behind the flag — bucket counts, beat counts, day counts. */
  facts: Record<string, unknown>
}

/** How loudly a flag should read — derived from its code and facts. */
export type FlagSeverity = 'high' | 'medium' | 'low'

/**
 * What kind of problem a flag is — rendered as the row's chip.
 *
 * `blocking` is reserved for the three flags that mirror a server refusal, so a
 * flag that merely wants attention never reads as one that stops the month.
 */
export type IssueCategory = 'blocking' | 'allocation' | 'schedule' | 'master-data'

/** A server flag prepared for display. The numbers are the server's. */
export interface PlanIssue {
  code: string
  category: IssueCategory
  severity: FlagSeverity
  label: string
  /** Day of month the flag points at, when it is date-specific. */
  day?: number
  /** Which transition this flag refuses, when it mirrors one. */
  blocks?: 'publish' | 'approve'
}

/* ─────────────────────────── the list (a month) ───────────────────────────── */

/**
 * One row of the plan list: a sales incharge's month.
 *
 * Three day-counts, not one, because the interesting question changes as the
 * month progresses — see `PlanProgress`.
 */
export interface JourneyPlan {
  id: string
  inchargeId: string
  inchargeName: string
  employeeCode: string
  /**
   * Territory the sales incharge is anchored to (the `city` filter matches it
   * exactly). Null when the API sends no `sales_incharge_city` — render sites
   * omit it rather than showing a placeholder.
   */
  headquarter: string | null
  status: PlanStatus
  /** What the admin promised. */
  daysAllocated: number
  /** Dates the sales incharge has actually put against it. */
  daysScheduled: number
  /** Scheduled dates a visit has landed on. */
  daysWorked: number
  /** `scheduled / allocated`. **0 when allocated is 0**, not 100. */
  schedulingPercentage: number
  /** `worked / scheduled`. **0 when scheduled is 0**, not 100. */
  completionPercentage: number
  citiesAllocated: number
  workingDays: number
  flags: PlanFlag[]
  /** One entry per calendar date. */
  monthStrip: MonthStripDay[]
}

/** Which column the list is sorted by, server-side. */
export type QueueSortBy =
  'sales_incharge' | 'status' | 'scheduling' | 'completion' | 'days_allocated'

/** Server-side query for the list. `periodMonth` is required (`yyyy-MM`). */
export interface QueueParams {
  periodMonth: string
  page?: number
  pageSize?: number
  /** The chain tabs. */
  status?: PlanStatus
  /** Matches sales incharge name OR employee code, case-insensitive. */
  search?: string
  /** Exact match on the sales incharge's territory. */
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

/* ─────────────────── the allocation (counts, not dates) ───────────────────── */

/**
 * One activity bucket: "four weekly offs".
 *
 * Only activities flagged `is_admin_allocatable` may appear — field selling never
 * does, because which day the sales incharge sells is his to decide.
 */
export interface ActivityAllocation {
  activityId: number
  activityCode: ActivityCode | null
  activityName: string | null
  /** Days the admin promised to this activity. */
  daysCount: number
  /** Dates the sales incharge has actually put against it. */
  daysScheduled: number
}

/**
 * One city bucket: "twenty days in Rajkot".
 *
 * Only cities the sales incharge's **allocated beats** actually sit in can appear.
 */
export interface CityAllocation {
  cityId: string
  cityName: string | null
  daysCount: number
  daysScheduled: number
  /** `solver` — proposed at generate. `manual` — the admin's own. */
  source: 'solver' | 'manual'
  /** **0 when the sales incharge no longer holds beats here** — the `city_without_beats` flag. */
  beatCount: number
  outletCount: number
}

/**
 * The pickers behind the allocation editor, and **the whitelist the Save
 * enforces**: anything absent from it is refused with a 400.
 *
 * It needs no plan to exist — the admin opens it to build the month.
 */
export interface AllocationOptions {
  inchargeId: string
  /** What the counts must add up to. */
  totalDays: number
  /** The activity master, filtered to admin-allocatable and active. */
  activities: {
    activityId: number
    code: ActivityCode
    name: string
    isWorkingDay: boolean
  }[]
  /** Derived from the beats **currently** allocated to the sales incharge. */
  cities: {
    cityId: string
    cityName: string | null
    beatCount: number
    outletCount: number
    /**
     * **`null` = never worked**, which the solver weighs heaviest. Do not render
     * it as "long ago".
     */
    lastWorkedDate: string | null
  }[]
}

/**
 * The allocation Save body. Each field is a **full replacement** of what it
 * covers; an omitted field is untouched.
 *
 * It does not touch the schedule. Re-allocating under a schedule that no longer
 * fits is allowed and leaves a `schedule_mismatch` flag — better than deleting
 * the sales incharge's work. Refused (409) once the plan is `approved`.
 */
export interface SaveAllocationInput {
  activityAllocations?: { activityId: number; daysCount: number }[]
  cityAllocations?: { cityId: string; daysCount: number }[]
}

/* ───────────────────────── the schedule (dates) ───────────────────────────── */

/** A beat the day carries, in the intended order. */
export interface PlanDayBeat {
  /** Id of the day-beat row. */
  id: string
  beatId: string
  beatName: string
  /** "Best available" order — planned once the day started, advisory before. */
  sequence: number
  /** Outlets snapshotted when the day was opened. */
  stopCount: number
  /** A visit landed on it; it is history. */
  locked: boolean
}

/**
 * One dated day of the schedule. **`days` is empty on a `draft` and on a freshly
 * `published` plan** — draw the calendar from `monthStrip` and use this for the
 * detail of the dates that exist.
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
  cityId: string | null
  cityName: string | null
  /** `admin` marks a correction the admin made after submission. */
  origin: DayOrigin
  /** When the row was written. */
  selectedAt: string | null
  beats: PlanDayBeat[]
  jointWorkingInchargeId: string | null
  jointWorkingInchargeName: string | null
  /** Free-text note carried with the day (holiday name, leave reason, venue). */
  reason: string | null
  /** A visit landed on it — **it survives whatever the correction pass sends**. */
  locked: boolean
  lockedAt: string | null
}

/**
 * One day of the correction pass, as the save body carries it.
 *
 * Per-day rules, enforced server-side and mirrored by the editor:
 * - An activity with `requiresBeat` needs a `cityId` **and** at least one beat.
 * - An activity without it must have **neither**.
 * - Every beat must be allocated to the sales incharge **and** sit in that day's city. (A
 *   beat whose own city is unknown is allowed — that is a gap in the beat master,
 *   not a scheduling error.)
 * - **No limit on beats per day**, and `beatIds` order is the intended order.
 */
export interface ScheduleDayInput {
  /** `yyyy-MM-dd`, inside the period. */
  date: string
  activityId: number
  cityId?: string | null
  beatIds?: string[]
  jointWorkingInchargeId?: string | null
  reason?: string | null
}

/**
 * The correction pass — a **full replacement**, so send every date.
 *
 * Open from `submitted` onward, **including after approval**, because a live
 * month has to be correctable and the sales incharge can no longer do it; refused (409) on a
 * `draft` or `published` plan, where the schedule is his. Correcting an approved
 * plan does **not** reopen the cycle.
 *
 * **Locked dates survive whatever is sent** — send them anyway, they are skipped.
 */
export interface SaveScheduleInput {
  days: ScheduleDayInput[]
}

/* ───────────────────── one sales incharge's month, in full ───────────────────────────── */

/**
 * The month's numbers, exactly as the server computes them. Nothing here is
 * recomputed on the client.
 *
 * Three day-counts because the interesting question changes as the month
 * progresses: `daysAllocated` is what the admin promised, `daysScheduled` is what
 * the sales incharge dated (the figure that matters **before** approval), `daysWorked` is
 * what a visit landed on (the figure that matters **after** it).
 *
 * A past scheduled date with no visit is `missed`, not worked — never derive
 * "worked" from `date < today`.
 */
export interface PlanProgress {
  daysAllocated: number
  daysScheduled: number
  daysWorked: number
  /** `scheduled / allocated`. **0 when the denominator is 0**, not 100. */
  schedulingPercentage: number
  /** `worked / scheduled`. **0 when the denominator is 0**, not 100. */
  completionPercentage: number
  citiesAllocated: number
  beatsScheduled: number
  workingDays: number
  totalDays: number
  /**
   * `daysAllocated - totalDays`. **0 means ready to publish**; publish is refused
   * otherwise, because a month published two days short is one the sales incharge can never
   * complete.
   */
  allocationVariance: number
}

/** A sales incharge's month in full, as opened from the list. */
export interface JourneyPlanDetail {
  id: string
  inchargeId: string
  inchargeName: string
  employeeCode: string
  headquarter: string | null
  /** Month covered, as `yyyy-MM` (the API sends the 1st of the month). */
  month: string
  status: PlanStatus
  /** Provenance of the allocation. */
  generatedBy: PlanSource
  generatedAt: string | null
  publishedAt: string | null
  submittedAt: string | null
  approvedAt: string | null
  /** THE ALLOCATION: day-counts per activity and per city. */
  activityAllocations: ActivityAllocation[]
  cityAllocations: CityAllocation[]
  progress: PlanProgress
  /** The server's own verdicts — never re-derived from the flags. */
  canPublish: boolean
  canApprove: boolean
  flags: PlanFlag[]
  /** One entry per calendar date — draw the calendar from this. */
  monthStrip: MonthStripDay[]
  /** Only the dates that exist. **Empty on a draft**, and that is correct. */
  days: PlanDay[]
}

/** What `publish` and `approve` answer with. Both need `journey-plan:approve`. */
export interface TransitionResult {
  journeyPlanId: string
  status: PlanStatus
  daysAllocated: number
  daysScheduled: number
}

/** One entry of the sales incharge switcher — it already carries the plan id and status. */
export interface PlanRepOption {
  inchargeId: string
  inchargeName: string
  employeeCode: string
  journeyPlanId: string
  status: PlanStatus
}

/* ───────────────────────────── generate a month ───────────────────────────── */

/** What happened to one sales incharge in a generation run. */
export type GenerateOutcome =
  | 'created'
  | 'replaced'
  | 'skipped_existing'
  /** The plan has left `draft` — regenerating would discard the sales incharge's schedule. */
  | 'skipped_in_progress'
  | 'no_beats'
  | 'failed'

/**
 * How many days of the month an activity must take, **for every sales incharge in the run**
 * — "one monthly meeting, four weekly offs" is a company fact.
 *
 * Dateless on purpose: the office fixes the *amount*, and which date it lands on
 * is the sales incharge's to decide a month later.
 */
export interface ActivityQuota {
  activityId: number
  /** Days in the period, at least 1 and never more than the month is long. */
  daysCount: number
}

/**
 * What a run asks for. The solver then splits each sales incharge's remaining days across
 * his own cities, weighted by how much work each holds and by how long it has
 * gone untouched. **Every plan lands as a `draft`.**
 */
export interface GenerateInput {
  periodMonth: string
  /** Omit for every sales incharge in the caller's scope. */
  inchargeIds?: string[]
  /** Applies to EVERY sales incharge in the run. */
  activityAllocations?: ActivityQuota[]
  /** Generation skips a sales incharge who already has a plan unless this is set. */
  replaceExisting?: boolean
  seed?: string
}

/**
 * Per sales incharge outcomes plus the run's totals. **One sales incharge's failure does not fail the
 * run** — render the list, never treat a non-zero `failed` as a whole-run error.
 */
export interface GenerateResult {
  results: {
    inchargeId: string
    outcome: GenerateOutcome
    journeyPlanId: string | null
    daysAllocated: number
    citiesAllocated: number
    /** Why it failed or was skipped, when the server says. */
    message: string | null
  }[]
  created: number
  skipped: number
  failed: number
}

/**
 * A beat allocated to the incharge — the pool a day's beats are chosen from.
 *
 * `cityId` is what makes the correction pass checkable client-side: a beat may
 * only go on a day whose city it sits in. **`null` is allowed** — that is a gap
 * in the beat master (its primary distributor has no city), not a scheduling
 * error, and such a beat is silently absent from the city pickers.
 */
export interface AllocatedBeat {
  id: string
  name: string
  cityId: string | null
  /** Outlets on the beat, when the list carries them. */
  outlets: number | null
}

/* ────────────────── live day (one incharge's month, actual) ───────────────── */

/**
 * Did he work — a different question from *at what*, which `activityName`
 * answers.
 */
export type RepDayStatus =
  'worked' | 'official_work' | 'leave' | 'holiday' | 'weekly_off' | 'not_started'

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
  /** Punch time as `hh:mm a` in IST, derived from the ISO timestamp. */
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
 * walk through those fixes anchored at the sales incharge's day-start coordinate.
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
   * every beat here is the sales incharge's own choice.
   */
  beats: { id: string; name: string }[]
  /**
   * Do those beats still sit in the day's **allocated city**?
   *
   * The scheduler refuses an out-of-city beat, so `false` means the **beat master
   * has drifted** since approval — his outlet list is for a town he is not in.
   * **`true` on a day with no beats at all** — a meeting has no city to be off.
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
  /** Null when the conversation has outlived the plan it was opened against. */
  journeyPlanId: string | null
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
