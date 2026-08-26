/**
 * Journey-plan fetchers. Every response is zod-parsed and mapped into the
 * feature's camelCase domain types here, so no component ever sees a snake_case
 * field or an unvalidated body.
 *
 * The write surface is five calls, and they are deliberately different things:
 *
 * - `createPlan` — opens ONE empty draft for a sales incharge's month. This is
 *   what `journey-plan:create` means now; there is no generate and no solver.
 * - `saveAllocation` — the admin's **day-counts** per activity and per
 *   distributor. Full replacements, and it never touches the schedule.
 * - `saveSchedule` — the **correction pass** over the sales incharge's calendar, open from
 *   `submitted` onward. A full replacement, so every date goes.
 * - `publishPlan` / `approvePlan` — the two transitions, both guarded by the one
 *   `journey-plan:approve` key. Nothing goes backwards; there is no reject.
 *
 * Both PATCHes answer with the whole plan, progress and flags recomputed, so
 * callers replace their state wholesale rather than reconciling.
 */
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import {
  activityListSchema,
  allocatedBeatListSchema,
  allocationOptionsSchema,
  journeyPlanDetailSchema,
  journeyPlanListSchema,
  planRepsSchema,
  transitionSchema,
  type JourneyPlanDetailRow,
  type JourneyPlanRow,
} from '../schemas'
import { dayOfMonth, monthOf } from '../lib/journey-format'
import { toPlanStatus } from '../lib/plan-status'
import type {
  ActivityDef,
  AllocatedBeat,
  AllocationOptions,
  CreatePlanInput,
  DayLabel,
  DayOrigin,
  JourneyPlan,
  JourneyPlanDetail,
  MonthStripDay,
  PlanDay,
  PlanFlag,
  PlanRepOption,
  PlanSource,
  QueueParams,
  QueueResult,
  SaveAllocationInput,
  SaveScheduleInput,
  TransitionResult,
  VisitDistributor,
} from '../types'

/** Ids travel as numbers where the API takes numbers; a non-numeric id passes through. */
function toApiId(value: string): number | string {
  return Number(value) || value
}

/** The five labels the server derives. */
const DAY_LABELS: DayLabel[] = ['worked', 'planned', 'holiday', 'missed', 'unscheduled']

/**
 * Narrow the wire's `label`.
 *
 * An unknown label falls back to `unscheduled` — the one value that badges
 * nothing. Falling back to `missed` would invent a warning out of a server
 * version this client hasn't caught up with.
 */
function toDayLabel(value: string | null | undefined): DayLabel {
  return DAY_LABELS.includes(value as DayLabel) ? (value as DayLabel) : 'unscheduled'
}

/**
 * `rep` | `admin`, or null when no day row exists for the date.
 *
 * Only an explicit `admin` reads as a correction: treating an unlabelled row as
 * the admin's would mark the whole month as corrected the moment a field went
 * missing, which is the one thing this value exists to distinguish.
 */
function toOrigin(value: string | null | undefined): DayOrigin | null {
  if (value === 'admin') return 'admin'
  if (value === 'rep') return 'rep'
  return null
}

/**
 * One calendar date of the strip.
 *
 * The three arrays are plural because a date carries a LIST of entries now —
 * folding them into a single code would silently hide the second half of a
 * doubled-up day.
 */
function toStripDay(day: {
  date: string
  label: string
  activity_codes: string[]
  distributor_ids: string[]
  city_ids: string[]
  origin?: string | null
  beat_count: number
}): MonthStripDay {
  return {
    date: day.date,
    day: dayOfMonth(day.date),
    label: toDayLabel(day.label),
    activityCodes: day.activity_codes,
    distributorIds: day.distributor_ids,
    cityIds: day.city_ids,
    origin: toOrigin(day.origin),
    beatCount: day.beat_count,
  }
}

/** The server's warnings, order preserved — it sorted them most severe first. */
function toFlags(
  flags:
    | {
        code: string
        blocking?: boolean | null
        date?: string | null
        distributor_id?: string | null
        distributor_name?: string | null
        city_id?: string | null
        city_name?: string | null
        activity_id?: number | null
        activity_name?: string | null
        beat_id?: string | null
        beat_name?: string | null
        facts?: Record<string, unknown> | null
      }[]
    | null
    | undefined,
): PlanFlag[] {
  return (flags ?? []).map((flag) => ({
    code: flag.code,
    // Read, never derived. A missing value reads as advisory, which is what every
    // flag is today — inventing a block out of an absent field would grey out a
    // button the server would happily have accepted.
    blocking: flag.blocking ?? false,
    date: flag.date ?? null,
    distributorId: flag.distributor_id ?? null,
    distributorName: flag.distributor_name ?? null,
    cityId: flag.city_id ?? null,
    cityName: flag.city_name ?? null,
    activityId: flag.activity_id ?? null,
    activityName: flag.activity_name ?? null,
    beatId: flag.beat_id ?? null,
    beatName: flag.beat_name ?? null,
    facts: flag.facts ?? {},
  }))
}

/** Map a list row, keeping every calendar day of the month strip. */
function toPlanRow(row: JourneyPlanRow): JourneyPlan {
  return {
    id: row.id,
    inchargeId: row.sales_incharge_id ?? '',
    inchargeName: row.sales_incharge_name ?? '—',
    employeeCode: row.sales_incharge_code ?? '',
    headquarter: row.sales_incharge_city ?? null,
    status: toPlanStatus(row.status),
    daysAllocated: row.days_allocated,
    daysScheduled: row.days_scheduled,
    entriesScheduled: row.entries_scheduled,
    daysWorked: row.days_worked,
    schedulingPercentage: row.scheduling_percentage,
    completionPercentage: row.completion_percentage,
    distributorsAllocated: row.distributors_allocated,
    workingDays: row.working_days,
    flags: toFlags(row.flags),
    monthStrip: (row.month_strip ?? []).map(toStripDay),
  }
}

/** Translate the list's camelCase params into the endpoint's query string. */
function toQueueQuery(params: QueueParams): Record<string, string | number | boolean> {
  const q: Record<string, string | number | boolean> = {
    period_month: params.periodMonth,
  }
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.status) q.status = params.status
  if (params.search) q.search = params.search
  if (params.city) q.city = params.city
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /journey-plans — one page of the month's plans. */
export async function fetchQueue(params: QueueParams): Promise<QueueResult> {
  try {
    const raw = await http.get<unknown>(endpoints.JOURNEY_PLAN.LIST, {
      params: toQueueQuery(params),
    })
    const res = journeyPlanListSchema.parse(raw)
    const rows = res.journey_plans.map(toPlanRow)
    return {
      rows,
      total: res.total ?? rows.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? rows.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load the monthly journey plans.')
  }
}

/**
 * The shared visit-target shape. **Names may be null** — the distributor has left
 * the sales incharge's beats since the month was drafted, and that is the honest
 * answer rather than a gap to paper over.
 */
function toVisitDistributors(
  rows:
    | {
        distributor_id: string
        distributor_name?: string | null
        city_id?: string | null
        city_name?: string | null
      }[]
    | null
    | undefined,
): VisitDistributor[] {
  return (rows ?? []).map((row) => ({
    distributorId: row.distributor_id,
    distributorName: row.distributor_name ?? null,
    cityId: row.city_id ?? null,
    cityName: row.city_name ?? null,
  }))
}

/** `manual` | `import` — anything unrecognised reads as `manual`. */
function toSource(value: string | null | undefined): PlanSource {
  return value === 'import' ? 'import' : 'manual'
}

/** Map one plan in full — the same shape both writes answer with. */
function toPlanDetail(r: JourneyPlanDetailRow): JourneyPlanDetail {
  // A date, then everything on it. The date-level facts (locked, origin) stay on
  // the day; the work moves down into `activities`, in the sales incharge's own
  // intended order.
  const days: PlanDay[] = (r.days ?? []).map((day) => ({
    id: day.id,
    date: day.date,
    day: dayOfMonth(day.date),
    // Unlabelled reads as the sales incharge's: `admin` marks a correction, and calling an
    // un-labelled row a correction would show the whole month as edited.
    origin: day.origin === 'admin' ? 'admin' : 'rep',
    selectedAt: day.selected_at ?? null,
    activities: [...(day.activities ?? [])]
      // `sequence` is the intended order and array order is not guaranteed to
      // match it; reading it off the array would quietly reshuffle his day.
      .sort((a, b) => a.sequence - b.sequence)
      .map((entry) => ({
        id: entry.id,
        sequence: entry.sequence,
        activityId: entry.activity_id ?? 0,
        activityCode: entry.activity_code ?? '',
        activityName: entry.activity_name ?? '—',
        distributorId: entry.distributor_id ?? null,
        distributorName: entry.distributor_name ?? null,
        cityId: entry.city_id ?? null,
        cityName: entry.city_name ?? null,
        pinned: Boolean(entry.pinned),
        // Order matters here and nowhere else: on an entry it is the order he
        // means to call on them in, and the API returns it that way.
        distributors: toVisitDistributors(entry.distributors),
        beats: [...(entry.beats ?? [])]
          .sort((a, b) => a.sequence - b.sequence)
          .map((beat) => ({
            id: beat.id,
            beatId: beat.beat_id,
            beatName: beat.beat_name ?? `Beat ${beat.beat_id}`,
            sequence: beat.sequence,
            stopCount: beat.stop_count,
            locked: Boolean(beat.locked),
          })),
        jointWorkingInchargeId: entry.joint_working_sales_incharge_id,
        jointWorkingInchargeName: entry.joint_working_sales_incharge_name ?? null,
        reason: entry.reason ?? null,
      })),
    locked: Boolean(day.locked),
    lockedAt: day.locked_at ?? null,
  }))

  return {
    id: r.id,
    inchargeId: r.sales_incharge_id ?? '',
    inchargeName: r.sales_incharge_name ?? '—',
    employeeCode: r.sales_incharge_code ?? '',
    headquarter: r.sales_incharge_city ?? null,
    month: monthOf(r.period_month),
    status: toPlanStatus(r.status),
    generatedBy: toSource(r.generated_by),
    generatedAt: r.generated_at ?? null,
    publishedAt: r.published_at ?? null,
    submittedAt: r.submitted_at ?? null,
    approvedAt: r.approved_at ?? null,
    activityAllocations: (r.activity_allocations ?? []).map((bucket) => ({
      activityId: bucket.activity_id,
      activityCode: bucket.activity_code ?? null,
      activityName: bucket.activity_name ?? null,
      cityId: bucket.city_id ?? null,
      cityName: bucket.city_name ?? null,
      // A set on the bucket, returned ascending by id — non-empty only on a
      // visit. The ORDER a date calls on them in lives on the entry, not here.
      distributors: toVisitDistributors(bucket.distributors),
      dates: bucket.dates ?? [],
      daysCount: bucket.days_count,
      daysScheduled: bucket.days_scheduled,
    })),
    distributorAllocations: (r.distributor_allocations ?? []).map((bucket) => ({
      distributorId: bucket.distributor_id,
      distributorName: bucket.distributor_name ?? null,
      cityId: bucket.city_id ?? null,
      cityName: bucket.city_name ?? null,
      daysCount: bucket.days_count,
      daysScheduled: bucket.days_scheduled,
      beatCount: bucket.beat_count,
      outletCount: bucket.outlet_count,
    })),
    progress: {
      daysAllocated: r.days_allocated,
      daysScheduled: r.days_scheduled,
      entriesScheduled: r.entries_scheduled,
      daysWorked: r.days_worked,
      schedulingPercentage: r.scheduling_percentage,
      completionPercentage: r.completion_percentage,
      distributorsAllocated: r.distributors_allocated,
      beatsScheduled: r.beats_scheduled,
      workingDays: r.working_days,
      totalDays: r.total_days,
      allocationVariance: r.allocation_variance,
    },
    // The server's own verdicts, never re-derived from the counts: publish only
    // wants one bucket on a draft, and approve re-checks nothing at all.
    canPublish: Boolean(r.can_publish),
    canApprove: Boolean(r.can_approve),
    flags: toFlags(r.flags),
    monthStrip: (r.month_strip ?? []).map(toStripDay),
    days,
  }
}

/** GET /journey-plans/{id} — one sales incharge's month in full. */
export async function fetchPlan(id: string): Promise<JourneyPlanDetail> {
  try {
    const raw = await http.get<unknown>(endpoints.JOURNEY_PLAN.GET(id))
    return toPlanDetail(journeyPlanDetailSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to load the journey plan.')
  }
}

/**
 * POST /journey-plans — open ONE empty draft for a sales incharge's month.
 *
 * There is no generate and no solver: field time is allocated per distributor,
 * and a distributor is a commercial relationship rather than something a neglect
 * heuristic can propose. What lands is a bare draft the sales incharge cannot
 * see; the buckets go on with `saveAllocation`.
 *
 * **Idempotent by refusal, not by silence**: a sales incharge who already has a
 * plan for the period gets a 409 naming the existing one, so a double-click
 * cannot quietly hand back someone else's month.
 */
export async function createPlan(input: CreatePlanInput): Promise<JourneyPlanDetail> {
  try {
    const raw = await http.post<unknown>(endpoints.JOURNEY_PLAN.CREATE, {
      sales_incharge_id: toApiId(input.inchargeId),
      period_month: input.periodMonth,
    })
    return toPlanDetail(journeyPlanDetailSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to create the plan.')
  }
}

/**
 * PATCH /journey-plans/{id} — the allocation, as day-counts.
 *
 * Both fields are **full replacements** and both optional: an omitted field is
 * left alone. Anything absent from `allocation-options` is refused with a 400,
 * and the whole call is refused with a 409 once the plan is `approved`.
 *
 * The totals are **not** capped at the length of the month — an over-allocation
 * raises the `allocation_over_month` flag rather than an error.
 */
export async function saveAllocation(
  id: string,
  input: SaveAllocationInput,
): Promise<JourneyPlanDetail> {
  try {
    const raw = await http.patch<unknown>(endpoints.JOURNEY_PLAN.SAVE(id), {
      ...(input.activityAllocations
        ? {
            activity_allocations: input.activityAllocations.map((bucket) => ({
              activity_id: bucket.activityId,
              // Sent only where it exists: `null` and absent both mean
              // "anywhere", and the bucket's key is the pair either way.
              ...(bucket.cityId ? { city_id: toApiId(bucket.cityId) } : {}),
              // Same rule as the city: sent only where the activity has one to
              // send, so a weekly-off bucket keeps the shape it always had.
              ...(bucket.distributorIds?.length
                ? { distributor_ids: bucket.distributorIds.map(toApiId) }
                : {}),
              // Pinned dates, when the admin pinned any. Absent and empty mean
              // the same thing: the dates are the sales incharge's to pick.
              ...(bucket.dates?.length ? { dates: bucket.dates } : {}),
              days_count: bucket.daysCount,
            })),
          }
        : {}),
      ...(input.distributorAllocations
        ? {
            distributor_allocations: input.distributorAllocations.map((bucket) => ({
              distributor_id: toApiId(bucket.distributorId),
              days_count: bucket.daysCount,
            })),
          }
        : {}),
    })
    return toPlanDetail(journeyPlanDetailSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to save the allocation.')
  }
}

/**
 * PATCH /journey-plans/{id}/schedule — the correction pass.
 *
 * A **full replacement**: every date the month should carry has to be in `days`,
 * because an omitted date is a deleted one. Locked dates are skipped by the
 * server rather than rejected, so they are sent along with the rest.
 *
 * Rows land with `origin: "admin"`, which is how the screen shows where the
 * approved calendar differs from what the sales incharge handed over.
 */
export async function saveSchedule(
  id: string,
  input: SaveScheduleInput,
): Promise<JourneyPlanDetail> {
  try {
    const raw = await http.patch<unknown>(endpoints.JOURNEY_PLAN.SCHEDULE(id), {
      days: input.days.map((day) => ({
        date: day.date,
        entries: day.entries.map((entry) => ({
          activity_id: entry.activityId,
          // The visit targets, in order. Sent only where there are any: the API
          // refuses a non-empty list on an activity that takes none.
          ...(entry.distributorIds?.length
            ? { distributor_ids: entry.distributorIds.map(toApiId) }
            : {}),
          // Each key is sent only where it exists. A beat-taking activity must
          // carry a distributor and beats; one without must carry neither, and
          // an explicit null is not the same as an absent key to a schema that
          // forbids the pairing.
          ...(entry.distributorId
            ? { distributor_id: toApiId(entry.distributorId) }
            : {}),
          // Only read on a beatless entry — on a field entry the server derives
          // the city from the beats and ignores whatever is sent.
          ...(entry.cityId ? { city_id: toApiId(entry.cityId) } : {}),
          ...(entry.beatIds?.length
            ? { beat_ids: entry.beatIds.map(toApiId) }
            : {}),
          ...(entry.jointWorkingInchargeId
            ? {
                joint_working_sales_incharge_id: toApiId(entry.jointWorkingInchargeId),
              }
            : {}),
          ...(entry.reason ? { reason: entry.reason } : {}),
        })),
      })),
    })
    return toPlanDetail(journeyPlanDetailSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to save the schedule.')
  }
}

/**
 * POST /journey-plans/{id}/publish — `draft` → `published`, releasing the month
 * to the sales incharge.
 *
 * The only precondition is that the plan has **at least one bucket** on it. A
 * partial month is the normal case: the admin allocates the work he cares about
 * and the sales incharge fills the rest. Read the server's `canPublish` — never
 * the variance, which is negative on almost every healthy plan.
 */
export async function publishPlan(id: string): Promise<TransitionResult> {
  try {
    const raw = await http.post<unknown>(endpoints.JOURNEY_PLAN.PUBLISH(id), {})
    return toTransition(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to publish the plan.')
  }
}

/**
 * POST /journey-plans/{id}/approve — `submitted` → `approved`.
 *
 * **The counts are not re-checked.** The sales incharge submits the month he
 * built and any variance from the allocation comes back as a flag for the admin
 * to judge, not as a refusal — so the only precondition is that the plan is
 * still `submitted`.
 *
 * There is no reject and no send-back: an admin who dislikes a schedule corrects
 * it with `saveSchedule` and then approves.
 */
export async function approvePlan(id: string): Promise<TransitionResult> {
  try {
    const raw = await http.post<unknown>(endpoints.JOURNEY_PLAN.APPROVE(id), {})
    return toTransition(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to approve the plan.')
  }
}

/** The receipt both transitions answer with. */
function toTransition(raw: unknown): TransitionResult {
  const res = transitionSchema.parse(raw)
  return {
    journeyPlanId: res.journey_plan_id,
    status: toPlanStatus(res.status),
    daysAllocated: res.days_allocated,
    daysScheduled: res.days_scheduled,
    entriesScheduled: res.entries_scheduled,
  }
}

/**
 * GET /journey-plans/reps — the sales incharge switcher. Each entry already carries its
 * plan id, so switching sales incharge is a client-side navigation with no extra lookup.
 */
export async function fetchPlanReps(periodMonth: string): Promise<PlanRepOption[]> {
  try {
    const raw = await http.get<unknown>(endpoints.JOURNEY_PLAN.REPS, {
      params: { period_month: periodMonth },
    })
    const res = planRepsSchema.parse(raw)
    return res.sales_incharges.map((rep) => ({
      inchargeId: rep.sales_incharge_id,
      inchargeName: rep.sales_incharge_name ?? '—',
      employeeCode: rep.sales_incharge_code ?? '',
      journeyPlanId: rep.journey_plan_id,
      status: toPlanStatus(rep.status),
    }))
  } catch (error) {
    throw asApiError(error, 'Failed to load the sales incharges for this month.')
  }
}

/**
 * GET /journey-plans/allocation-options — the allocatable activities and the
 * distributors the sales incharge's beats reach.
 *
 * **These two are the whitelist the allocation Save enforces**, not a
 * convenience: anything absent from them is refused with a 400. It needs no plan
 * to exist. The response's third list, `cities`, is dropped here — see
 * `AllocationOptions` for why the city pickers read the master instead.
 */
export async function fetchAllocationOptions(
  inchargeId: string,
  periodMonth: string,
): Promise<AllocationOptions> {
  try {
    const raw = await http.get<unknown>(endpoints.JOURNEY_PLAN.ALLOCATION_OPTIONS, {
      params: {
        sales_incharge_id: toApiId(inchargeId),
        period_month: periodMonth,
      },
    })
    const res = allocationOptionsSchema.parse(raw)
    return {
      inchargeId: res.sales_incharge_id ?? inchargeId,
      totalDays: res.total_days,
      activities: (res.activities ?? []).map((activity) => ({
        activityId: activity.activity_id,
        code: activity.code,
        name: activity.name,
        isWorkingDay: Boolean(activity.is_working_day),
        requiresDistributors: Boolean(activity.requires_distributors),
      })),
      distributors: (res.distributors ?? []).map((distributor) => ({
        distributorId: distributor.distributor_id,
        distributorName: distributor.distributor_name ?? null,
        cityId: distributor.city_id ?? null,
        cityName: distributor.city_name ?? null,
        beatCount: distributor.beat_count,
        outletCount: distributor.outlet_count,
      })),
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load the allocation options.')
  }
}

/**
 * GET /activities — the activity master behind the correction pass.
 *
 * Distinct from `allocation-options.activities`, which is narrowed to the
 * admin-allocatable rows and carries no `requires_beat`: the correction pass has
 * to know whether a day takes a city and beats, so it needs the master's booleans.
 */
export async function fetchActivities(): Promise<ActivityDef[]> {
  try {
    const raw = await http.get<unknown>(endpoints.ACTIVITY.LIST, {
      params: { page_size: 100 },
    })
    const res = activityListSchema.parse(raw)
    return res.activities.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      requiresBeat: Boolean(row.requires_beat),
      requiresDistributors: Boolean(row.requires_distributors),
      working: Boolean(row.is_working_day),
      coverage: Boolean(row.counts_toward_coverage),
      // `company_id: null` marks the seeded platform rows — read-only for tenants.
      platform: row.company_id == null,
    }))
  } catch (error) {
    throw asApiError(error, 'Failed to load the activity master.')
  }
}

/**
 * GET /sales-incharges/{id}/beats — every beat allocated to the sales incharge.
 *
 * **`distributorIds` is the load-bearing field**: the correction pass may only
 * put a beat on an entry whose distributor it serves, so the entry editor filters
 * this pool by the entry's distributor rather than offering all 60+.
 */
export async function fetchAllocatedBeats(inchargeId: string): Promise<AllocatedBeat[]> {
  try {
    const raw = await http.get<unknown>(endpoints.BEAT_ALLOCATION.ALLOCATED(inchargeId), {
      params: { page_size: 100 },
    })
    const res = allocatedBeatListSchema.parse(raw)
    return res.beats.map((beat) => ({
      id: beat.id,
      name: beat.name ?? beat.beat_name ?? `Beat ${beat.id}`,
      cityId: beat.city_id,
      distributorIds: (beat.distributors ?? []).map((distributor) => distributor.id),
      outlets: beat.outlet_count ?? beat.retailer_count ?? null,
    }))
  } catch (error) {
    throw asApiError(error, "Failed to load the incharge's allocated beats.")
  }
}
