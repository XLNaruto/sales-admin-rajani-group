/**
 * Journey-plan fetchers. Every response is zod-parsed and mapped into the
 * feature's camelCase domain types here, so no component ever sees a snake_case
 * field or an unvalidated body.
 *
 * The write surface is four calls, and they are deliberately different things:
 *
 * - `saveAllocation` — the admin's **day-counts** per activity and per city. Full
 *   replacements, and it never touches the schedule.
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
  generateSchema,
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
  DayLabel,
  DayOrigin,
  GenerateInput,
  GenerateOutcome,
  GenerateResult,
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
} from '../types'

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

/** One calendar date of the strip. */
function toStripDay(day: {
  date: string
  label: string
  activity_code?: string | null
  city_id?: string | null
  origin?: string | null
  beat_count: number
}): MonthStripDay {
  return {
    date: day.date,
    day: dayOfMonth(day.date),
    label: toDayLabel(day.label),
    activityCode: day.activity_code ?? null,
    cityId: day.city_id ?? null,
    origin: toOrigin(day.origin),
    beatCount: day.beat_count,
  }
}

/** The server's warnings, order preserved — it sorted them most severe first. */
function toFlags(
  flags:
    | {
        code: string
        date?: string | null
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
    date: flag.date ?? null,
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
    headquarter: row.sales_incharge_city ?? '—',
    status: toPlanStatus(row.status),
    daysAllocated: row.days_allocated,
    daysScheduled: row.days_scheduled,
    daysWorked: row.days_worked,
    schedulingPercentage: row.scheduling_percentage,
    completionPercentage: row.completion_percentage,
    citiesAllocated: row.cities_allocated,
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

/** `solver` | `manual` | `import` — anything unrecognised reads as `manual`. */
function toSource(value: string | null | undefined): PlanSource {
  return value === 'solver' || value === 'import' ? value : 'manual'
}

/** Map one plan in full — the same shape both writes answer with. */
function toPlanDetail(r: JourneyPlanDetailRow): JourneyPlanDetail {
  const days: PlanDay[] = (r.days ?? []).map((day) => ({
    id: day.id,
    date: day.date,
    day: dayOfMonth(day.date),
    activityId: day.activity_id ?? 0,
    activityCode: day.activity_code ?? '',
    activityName: day.activity_name ?? '—',
    cityId: day.city_id ?? null,
    cityName: day.city_name ?? null,
    // Unlabelled reads as the sales incharge's: `admin` marks a correction, and calling an
    // un-labelled row a correction would show the whole month as edited.
    origin: day.origin === 'admin' ? 'admin' : 'rep',
    selectedAt: day.selected_at ?? null,
    beats: (day.beats ?? []).map((beat) => ({
      id: beat.id,
      beatId: beat.beat_id,
      beatName: beat.beat_name ?? `Beat ${beat.beat_id}`,
      sequence: beat.sequence,
      stopCount: beat.stop_count,
      locked: Boolean(beat.locked),
    })),
    jointWorkingInchargeId: day.joint_working_sales_incharge_id,
    jointWorkingInchargeName: day.joint_working_sales_incharge_name ?? null,
    reason: day.reason ?? null,
    locked: Boolean(day.locked),
    lockedAt: day.locked_at ?? null,
  }))

  return {
    id: r.id,
    inchargeId: r.sales_incharge_id ?? '',
    inchargeName: r.sales_incharge_name ?? '—',
    employeeCode: r.sales_incharge_code ?? '',
    headquarter: r.sales_incharge_city ?? '—',
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
      daysCount: bucket.days_count,
      daysScheduled: bucket.days_scheduled,
    })),
    cityAllocations: (r.city_allocations ?? []).map((bucket) => ({
      cityId: bucket.city_id,
      cityName: bucket.city_name ?? null,
      daysCount: bucket.days_count,
      daysScheduled: bucket.days_scheduled,
      source: bucket.source === 'solver' ? 'solver' : 'manual',
      beatCount: bucket.beat_count,
      outletCount: bucket.outlet_count,
    })),
    progress: {
      daysAllocated: r.days_allocated,
      daysScheduled: r.days_scheduled,
      daysWorked: r.days_worked,
      schedulingPercentage: r.scheduling_percentage,
      completionPercentage: r.completion_percentage,
      citiesAllocated: r.cities_allocated,
      beatsScheduled: r.beats_scheduled,
      workingDays: r.working_days,
      totalDays: r.total_days,
      allocationVariance: r.allocation_variance,
    },
    // The server's own verdicts, never re-derived: it checks each bucket
    // individually, and the totals can balance while the buckets do not.
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
 * PATCH /journey-plans/{id} — the allocation, as day-counts.
 *
 * Both fields are **full replacements** and both optional: an omitted field is
 * left alone. Anything absent from `allocation-options` is refused with a 400,
 * and the whole call is refused with a 409 once the plan is `approved`.
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
              days_count: bucket.daysCount,
            })),
          }
        : {}),
      ...(input.cityAllocations
        ? {
            city_allocations: input.cityAllocations.map((bucket) => ({
              city_id: Number(bucket.cityId) || bucket.cityId,
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
        activity_id: day.activityId,
        // Sent only where they exist: an activity without `requires_beat` must
        // carry NEITHER a city nor a beat, and an explicit null is not the same
        // as an absent key to a schema that forbids the pairing.
        ...(day.cityId ? { city_id: Number(day.cityId) || day.cityId } : {}),
        ...(day.beatIds?.length
          ? { beat_ids: day.beatIds.map((beatId) => Number(beatId) || beatId) }
          : {}),
        ...(day.jointWorkingInchargeId
          ? {
              joint_working_sales_incharge_id:
                Number(day.jointWorkingInchargeId) || day.jointWorkingInchargeId,
            }
          : {}),
        ...(day.reason ? { reason: day.reason } : {}),
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
 * Refused (400) unless the counts account for every calendar date: a month
 * published two days short is one the sales incharge can never complete. Read
 * `allocationVariance` (0 = ready) and `canPublish` before offering it.
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
 * Refused (400) unless the schedule consumes **each bucket exactly** — checked
 * bucket by bucket, not on the totals, because a day moved from Morbi to Rajkot
 * keeps the total right and the month wrong. The error `details` name the
 * offending buckets.
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
 * cities the sales incharge's beats sit in.
 *
 * **This is the whitelist the allocation Save enforces**, not a convenience:
 * anything absent from it is refused with a 400. It needs no plan to exist.
 */
export async function fetchAllocationOptions(
  inchargeId: string,
  periodMonth: string,
): Promise<AllocationOptions> {
  try {
    const raw = await http.get<unknown>(endpoints.JOURNEY_PLAN.ALLOCATION_OPTIONS, {
      params: {
        sales_incharge_id: Number(inchargeId) || inchargeId,
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
      })),
      cities: (res.cities ?? []).map((city) => ({
        cityId: city.city_id,
        cityName: city.city_name ?? null,
        beatCount: city.beat_count,
        outletCount: city.outlet_count,
        // Left null rather than defaulted: null means NEVER worked, which the
        // solver weighs heaviest, and a fallback date would hide that entirely.
        lastWorkedDate: city.last_worked_date ?? null,
      })),
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load the allocation options.')
  }
}

/** The outcomes the server reports; anything unrecognised reads as a failure. */
const OUTCOMES: GenerateOutcome[] = [
  'created',
  'replaced',
  'skipped_existing',
  'skipped_in_progress',
  'no_beats',
  'failed',
]

function toOutcome(value: string): GenerateOutcome {
  return OUTCOMES.includes(value as GenerateOutcome)
    ? (value as GenerateOutcome)
    : 'failed'
}

/**
 * POST /journey-plans/generate — draft each sales incharge's month.
 *
 * The activity buckets apply to **every sales incharge in the run**; the solver then splits
 * each sales incharge's remaining days across his own cities, weighted by how much work each
 * holds and by how long it has gone untouched. Every plan lands as a `draft`.
 *
 * A sales incharge whose plan has already left `draft` is `skipped_in_progress` even with
 * `replaceExisting` — regenerating would discard the schedule he wrote. **One
 * sales incharge's failure does not fail the run.**
 */
export async function generatePlans(input: GenerateInput): Promise<GenerateResult> {
  try {
    const raw = await http.post<unknown>(endpoints.JOURNEY_PLAN.GENERATE, {
      period_month: input.periodMonth,
      ...(input.inchargeIds?.length
        ? {
            sales_incharge_ids: input.inchargeIds.map((id) => Number(id) || id),
          }
        : {}),
      ...(input.activityAllocations?.length
        ? {
            activity_allocations: input.activityAllocations.map((bucket) => ({
              activity_id: bucket.activityId,
              days_count: bucket.daysCount,
            })),
          }
        : {}),
      ...(input.replaceExisting != null
        ? { replace_existing: input.replaceExisting }
        : {}),
      ...(input.seed ? { seed: input.seed } : {}),
    })
    const res = generateSchema.parse(raw)
    return {
      results: (res.results ?? []).map((row) => ({
        inchargeId: row.sales_incharge_id ?? '',
        outcome: toOutcome(row.outcome),
        journeyPlanId: row.journey_plan_id,
        daysAllocated: row.days_allocated,
        citiesAllocated: row.cities_allocated,
        message: row.message ?? null,
      })),
      created: res.created,
      skipped: res.skipped,
      failed: res.failed,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to generate the monthly plans.')
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
 * `cityId` is the load-bearing field: the correction pass may only put a beat on a
 * day whose city it sits in, so the day editor filters this pool by the day's
 * city rather than offering all 60+.
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
      outlets: beat.outlet_count ?? beat.retailer_count ?? null,
    }))
  } catch (error) {
    throw asApiError(error, "Failed to load the incharge's allocated beats.")
  }
}
