/**
 * Journey Management domain types.
 *
 * A *journey plan* is a **negotiation between the sales admin and one sales incharge, for
 * one month**. The admin allocates **counts** — "one meeting day, four weekly
 * offs, six days on Halvad Traders" — and never a date or a beat. The sales
 * incharge turns those counts into dates, picking the distributor and its beats
 * per piece of work, then hands the month back. The admin signs off, and may
 * still correct the calendar afterwards because a live month has to be fixable.
 *
 * Three things about this model are easy to get wrong:
 *
 * - **Field time is allocated per DISTRIBUTOR, not per city.** "Six days on
 *   Distributor A" is the unit. A city survives only as the optional *where* on
 *   an activity bucket — "two days of distributor search, in Rajkot" — and on a
 *   field entry it is DERIVED from the beats rather than chosen.
 * - **The allocation is PARTIAL.** The admin allocates the work he cares about
 *   and the sales incharge fills the rest of the month himself. Nothing refuses
 *   on the counts: publish needs one bucket, approve re-checks nothing, and an
 *   over-allocation is a flag rather than an error.
 * - **A date carries SEVERAL entries.** Retailing in the morning, a distributor
 *   visit in the afternoon. Each entry spends one day from its own bucket, so a
 *   doubled-up date spends two and `daysAllocated` may legitimately exceed the
 *   length of the month.
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

/**
 * How the plan's allocation came about. There is no `solver` any more — it went
 * with the city model it served, and the admin picks the distributors by hand.
 */
export type PlanSource = 'manual' | 'import'

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
  /**
   * The work must name the distributors it calls on — a **visit**, which takes
   * no beat and no `distributorId`. Data, never a code check.
   */
  requiresDistributors: boolean
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
  /**
   * Every activity on the date, in entry order. **Empty** on a date with no day
   * row, and **more than one** when the sales incharge doubled the date up.
   */
  activityCodes: ActivityCode[]
  /** Which distributor buckets the date spends. Empty on beatless-only dates. */
  distributorIds: string[]
  /** Cities the date touches, in entry order. */
  cityIds: string[]
  origin: DayOrigin | null
  /** DISTINCT beats across every entry on the date — 0 on an unscheduled date. */
  beatCount: number
}

/* ─────────────────────────────── the flags ────────────────────────────────── */

/**
 * The eight warnings the server raises, computed and never stored.
 *
 * **Every one of them is advisory.** Nothing refuses on the counts any more, so
 * none of these stops a transition — see `PlanFlag.blocking`, which the server
 * sends as `false` throughout and which is the only thing to read on the
 * question. A partial allocation is the normal state, not a defect.
 */
export type PlanFlagCode =
  /** Nothing allocated for field work — the sales incharge has no distributor. */
  | 'no_distributors_allocated'
  /** The counts promise more work than the month holds. Reachable, but worth saying. */
  | 'allocation_over_month'
  /** A bucket's scheduled entries do not match its count. */
  | 'schedule_mismatch'
  /** A scheduled entry falls outside every bucket — the sales incharge's own work. */
  | 'schedule_unallocated'
  /** An allocated distributor has no beat the sales incharge holds. */
  | 'distributor_without_beats'
  /** A scheduled beat no longer serves its entry's distributor. */
  | 'beat_outside_distributor'
  /** A scheduled activity is not admin-allocatable (field selling never is). */
  | 'activity_not_allocatable'
  /** Published, and the sales incharge has not started dating the month. */
  | 'awaiting_schedule'

/** One warning, most severe first as the server sends them. */
export interface PlanFlag {
  code: string
  /**
   * Would this stop the plan's next transition? **Always `false` today** — the
   * field is the server's, kept so a future gate has somewhere to say otherwise.
   * Never derive it from `code`.
   */
  blocking: boolean
  /** `yyyy-MM-dd` when the flag points at a date. */
  date: string | null
  distributorId: string | null
  distributorName: string | null
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
 * There is no `blocking` category any more: nothing here stops a transition, and
 * a chip that said so would be a lie about what the server does.
 */
export type IssueCategory = 'allocation' | 'schedule' | 'master-data'

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
  /** What the admin promised, across both bucket kinds. */
  daysAllocated: number
  /** DISTINCT dates the sales incharge has put against it. */
  daysScheduled: number
  /**
   * Pieces of work across the month — the figure that reconciles with the
   * buckets, since a doubled-up date spends two allocated days.
   */
  entriesScheduled: number
  /** Scheduled dates a visit has landed on. */
  daysWorked: number
  /**
   * `scheduled / allocated`. **0 when allocated is 0**, not 100 — and routinely
   * **over 100**, because the admin allocates part of the month and the sales
   * incharge fills the rest.
   */
  schedulingPercentage: number
  /** `worked / scheduled`. **0 when scheduled is 0**, not 100. */
  completionPercentage: number
  distributorsAllocated: number
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
 * One activity bucket: "four weekly offs", or "two days of distributor search,
 * in Rajkot".
 *
 * Only activities flagged `is_admin_allocatable` may appear — field selling never
 * does, because that is allocated by DISTRIBUTOR instead.
 *
 * **`cityId` is part of the bucket's identity**, not a decoration: the same
 * activity in two cities is two buckets, and matching a bucket on `activityId`
 * alone will silently merge them.
 */
/**
 * A distributor named on a visit — on the allocation bucket, and on the entry.
 *
 * **Every name here may be `null`**, and that is the honest answer rather than a
 * gap: the distributor has left the sales incharge's beat allocation since the
 * month was drafted. Render the id or a placeholder; never assume a name.
 */
export interface VisitDistributor {
  distributorId: string
  distributorName: string | null
  cityId: string | null
  cityName: string | null
}

export interface ActivityAllocation {
  activityId: number
  activityCode: ActivityCode | null
  activityName: string | null
  /** Where this work is to happen. Null on everything but a search-style activity. */
  cityId: string | null
  cityName: string | null
  /**
   * Distributors this bucket's days are to be spent on — only a
   * **distributor visit** carries any, and it may carry several. Unlike the
   * city, this is a set on ONE bucket rather than part of its identity: "four
   * days of distributor visit, across these three distributors".
   */
  distributors: VisitDistributor[]
  /**
   * Dates the admin PINNED on this bucket, `yyyy-MM-dd`.
   *
   * Optional, and normally empty: the model is that the admin allocates counts
   * and the sales incharge dates them. A date here is the exception — a meeting
   * that is on the 4th — and never more than `daysCount` of them.
   */
  dates: string[]
  /** Days the admin promised to this bucket. */
  daysCount: number
  /** Entries the sales incharge has actually put against it. */
  daysScheduled: number
}

/**
 * One distributor bucket: "six days on Halvad Traders". **The field allocation.**
 *
 * Only distributors reachable from the beats currently allocated to the sales
 * incharge can appear — the admin cannot promise days on a distributor the man
 * has no beat for. No beats here by design: he picks those under the distributor.
 */
export interface DistributorAllocation {
  distributorId: string
  distributorName: string | null
  /** The distributor's own city, for display only. */
  cityId: string | null
  cityName: string | null
  daysCount: number
  daysScheduled: number
  /**
   * Beats serving this distributor that the sales incharge currently holds —
   * what he has to choose from. **0 is the `distributor_without_beats` flag**:
   * the allocation was right when it was made and the beat master moved.
   */
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
  /**
   * Calendar days in the period. **Context, not a limit** — the admin may
   * allocate fewer, and the sales incharge fills the rest of the month himself.
   */
  totalDays: number
  /** The activity master, filtered to admin-allocatable and active. */
  activities: {
    activityId: number
    code: ActivityCode
    name: string
    isWorkingDay: boolean
    /**
     * The bucket must name at least one distributor. **Data, not a code check**
     * — today only `distributor_visit` sets it, and that is the client's to
     * change per activity, so never branch on the code.
     */
    requiresDistributors: boolean
  }[]
  /**
   * The field-allocation axis, derived from the beats **currently** allocated to
   * the sales incharge (`beat_allocations` → `beat_distributors`).
   */
  distributors: {
    distributorId: string
    distributorName: string | null
    cityId: string | null
    cityName: string | null
    beatCount: number
    outletCount: number
  }[]
}

/**
 * The API also returns a `cities` suggestion list here — the cities the rep's
 * reachable distributors already sit in. It is deliberately **not** modelled:
 * the only thing that takes a city is a distributor search, and a search is by
 * definition somewhere he has no distributor YET, so that list is the wrong one
 * to narrow the picker to. It is also empty wherever the distributor master
 * carries no city. The screens use the full city master instead
 * (`useCitySelect`), which the save accepts.
 */

/**
 * The allocation Save body. Each field is a **full replacement** of what it
 * covers; an omitted field is untouched.
 *
 * It does not touch the schedule. Re-allocating under a schedule that no longer
 * fits is allowed and leaves a `schedule_mismatch` flag — better than deleting
 * the sales incharge's work. Refused (409) once the plan is `approved`.
 */
export interface SaveAllocationInput {
  /** `cityId` is part of the bucket's key — omit it for "anywhere". */
  activityAllocations?: {
    activityId: number
    cityId?: string | null
    /** Only a distributor-visit bucket carries any; omitted where empty. */
    distributorIds?: string[]
    /** Pinned dates, `yyyy-MM-dd`. Optional; omitted where empty. */
    dates?: string[]
    daysCount: number
  }[]
  distributorAllocations?: { distributorId: string; daysCount: number }[]
}

/** `POST /journey-plans` — opens one empty draft for a sales incharge's month. */
export interface CreatePlanInput {
  inchargeId: string
  /** `yyyy-MM`. */
  periodMonth: string
}

/* ───────────────────────── the schedule (dates) ───────────────────────────── */

/** A beat the ENTRY carries, in the intended order. */
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
 * ONE piece of work on a date — the unit a day row used to be.
 *
 * A date may carry several: retailing for Distributor A in the morning, a
 * distributor visit in the afternoon. Each spends one day from its own bucket.
 */
export interface PlanDayEntry {
  id: string
  /** The order the sales incharge intends to take the day's work in. */
  sequence: number
  activityId: number
  activityCode: ActivityCode
  activityName: string
  /**
   * Whose allocation this entry spends. **Always set** on an activity that
   * requires a beat, **always null** on one that does not.
   */
  distributorId: string | null
  distributorName: string | null
  /** DERIVED from the beats on a field entry; the admin's instruction otherwise. */
  cityId: string | null
  cityName: string | null
  beats: PlanDayBeat[]
  /**
   * Fixed to this date by the ADMIN, from an allocation bucket's `dates`.
   *
   * **Not editable from the schedule screen, and never sent back in a schedule
   * save** — the server keeps it whatever the body says, and sending it is a
   * `JOURNEY_PLAN_ENTRY_PINNED` 400. To move one, edit the owning bucket's dates
   * on the allocation.
   */
  pinned: boolean
  /** Who this date calls on, in intended order. A visit entry only. */
  distributors: VisitDistributor[]
  jointWorkingInchargeId: string | null
  jointWorkingInchargeName: string | null
  /** Free-text note (holiday name, leave reason, venue). */
  reason: string | null
}

/**
 * One dated day of the schedule — a DATE and everything on it.
 *
 * **`days` is empty on a `draft` and on a freshly `published` plan** — draw the
 * calendar from `monthStrip` and use this for the detail of the dates that exist.
 *
 * The date-level facts stay here on purpose: `locked`, the origin and the day's
 * sequence are properties of the date, so "is the 10th locked?" has exactly one
 * answer however many entries it carries.
 */
export interface PlanDay {
  id: string
  /** ISO calendar date, `yyyy-MM-dd`. */
  date: string
  /** Day of month, 1-based — sliced off `date`, never read off a local `Date`. */
  day: number
  /** `admin` marks a correction the admin made after submission. */
  origin: DayOrigin
  /** When the row was written. */
  selectedAt: string | null
  /** Everything on the date, in intended order. **Never empty.** */
  activities: PlanDayEntry[]
  /** A visit landed on it — **it survives whatever the correction pass sends**. */
  locked: boolean
  lockedAt: string | null
}

/**
 * One piece of work, as the save body carries it.
 *
 * The shape is decided by the activity master's `requiresBeat`:
 * - `true` — `distributorId` is REQUIRED and at least one beat. `cityId` is
 *   ignored: the server derives it from the beats, because a beat's city comes
 *   from its primary distributor and that is the only honest answer.
 * - `false` — no distributor and no beats. `cityId` is OPTIONAL, and is what
 *   makes "distributor search, in Rajkot" expressible.
 *
 * Every beat must be allocated to the sales incharge **and serve
 * `distributorId`**. That replaced the old beat-sits-in-the-day's-city rule — and
 * it is stricter: a beat mapped to no distributor at all can no longer be
 * scheduled, because there is no bucket to charge the day to.
 */
export interface ScheduleEntryInput {
  activityId: number
  distributorId?: string | null
  cityId?: string | null
  beatIds?: string[]
  /**
   * Who this date calls on, **in intended order** — required on a visit entry
   * (`requiresDistributors`) and refused on every other activity. Distinct from
   * `distributorId`, which names the distributor BUCKET a field day is charged
   * to and stays null on a visit.
   */
  distributorIds?: string[]
  jointWorkingInchargeId?: string | null
  reason?: string | null
}

/**
 * One scheduled DATE of the correction pass. A date with no entries is not sent
 * at all — an empty list is refused.
 */
export interface ScheduleDayInput {
  /** `yyyy-MM-dd`, inside the period. */
  date: string
  entries: ScheduleEntryInput[]
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
  /** DISTINCT dates. */
  daysScheduled: number
  /** Pieces of work across every date — what reconciles with the buckets. */
  entriesScheduled: number
  daysWorked: number
  /** `scheduled / allocated`. **0 when the denominator is 0**, and often over 100. */
  schedulingPercentage: number
  /** `worked / scheduled`. **0 when the denominator is 0**, not 100. */
  completionPercentage: number
  distributorsAllocated: number
  beatsScheduled: number
  workingDays: number
  totalDays: number
  /**
   * `daysAllocated - totalDays`. **Negative is the ordinary case** — the admin
   * allocated part of the month and the sales incharge owns the rest. Positive
   * means more work promised than the month holds, which raises
   * `allocation_over_month` but refuses nothing. Publish does not read it.
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
  /** THE ALLOCATION: day-counts per activity and per distributor. */
  activityAllocations: ActivityAllocation[]
  distributorAllocations: DistributorAllocation[]
  progress: PlanProgress
  /**
   * The server's own verdicts — never re-derived from the flags.
   * `canPublish` is "a draft with at least one bucket on it"; `canApprove` is
   * "submitted", and the counts are not re-checked at either end.
   */
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
  /** DISTINCT dates. */
  daysScheduled: number
  entriesScheduled: number
}

/** One entry of the sales incharge switcher — it already carries the plan id and status. */
export interface PlanRepOption {
  inchargeId: string
  inchargeName: string
  employeeCode: string
  journeyPlanId: string
  status: PlanStatus
}

/**
 * A beat allocated to the incharge — the pool an entry's beats are chosen from.
 *
 * **`distributorIds` is the load-bearing field now.** A beat may only go on an
 * entry whose distributor it serves, so the picker filters on this rather than on
 * the city. A beat serving several distributors appears under each — it is
 * genuinely workable on any of their days.
 *
 * A beat with an **empty** `distributorIds` cannot be scheduled at all: there is
 * no bucket to charge the day to. That is a gap in the beat master, and the only
 * fix is there.
 *
 * `cityId` survives for display — it is derived from the primary distributor, and
 * `null` is legitimate.
 */
export interface AllocatedBeat {
  id: string
  name: string
  cityId: string | null
  /** Distributors this beat serves, primary first. */
  distributorIds: string[]
  /** Outlets on the beat, when the list carries them. */
  outlets: number | null
}

/* ────────────────── live day (one incharge's month, actual) ───────────────── */

/**
 * Did he work — a different question from *at what*, which `activityNames`
 * answers.
 */
export type RepDayStatus =
  'worked' | 'official_work' | 'leave' | 'holiday' | 'weekly_off' | 'not_started'

/**
 * The numbers a field day is judged on, as the SFA reports them. Displayed, not
 * recomputed — these get compared against FieldAssist's figures on day one.
 *
 * `TC = in_turn + ovt + to`; `OVC` sits OUTSIDE that sum; `PC ⊂ TC`. **`SC`
 * counts the stops snapshotted across EVERY entry on the date** — the calls he
 * set out to make. A date carrying retailing for two distributors counts both
 * beats' snapshots; they are one day's work.
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
  /**
   * Did he work. A leave/holiday/weekly-off code names the day only when it is
   * the ONLY thing on it — a date carrying leave AND a meeting reads as worked.
   */
  status: RepDayStatus
  /** Every activity on the date, in entry order. */
  activityCodes: ActivityCode[]
  /** The card's badges — reported ALONGSIDE `status`, never folded into it. */
  activityNames: string[]
  distributorIds: string[]
  distributorNames: string[]
  /** DISTINCT beats across every entry on the date. */
  beatIds: string[]
  beatNames: string[]
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
   * The beats he worked **across every entry on the date**, in the order he took
   * them. Replaces the old `assignedBeat` / `selectedBeat` pair: nothing assigns
   * beats to dates now, so every beat here is the sales incharge's own choice.
   */
  beats: { id: string; name: string }[]
  /**
   * Were all the beats he worked on the month's list?
   *
   * `false` is the **deviation** signal — he worked something nobody allocated.
   * **`true` on a day with no beats at all**, so a meeting never reads as off-plan.
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
