/**
 * Journey-plan fetchers. Every response is zod-parsed and mapped into the
 * feature's camelCase domain types here, so no component ever sees a snake_case
 * field or an unvalidated body.
 *
 * There are four reads and two writes, and that is the whole surface: list,
 * detail, rep switcher, activity master; generate a month, and save one
 * allocation. Nothing to approve, nothing to re-solve, no day-level edit — the
 * rep writes his own days from the app.
 *
 * The save returns the whole allocation with progress and flags already
 * recomputed, so callers replace their state wholesale rather than reconciling.
 */
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import {
  activityListSchema,
  allocatedBeatListSchema,
  generateSchema,
  journeyPlanDetailSchema,
  journeyPlanListSchema,
  planRepsSchema,
  type JourneyPlanDetailRow,
  type JourneyPlanRow,
} from '../schemas'
import { dayOfMonth, monthOf } from '../lib/journey-format'
import type {
  ActivityDef,
  AllocatedBeat,
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
  QueueParams,
  QueueResult,
  SavePlanInput,
} from '../types'

/** The five labels the server derives. Anything else reads as `unplanned`. */
const DAY_LABELS: DayLabel[] = ['worked', 'planned', 'holiday', 'absent', 'unplanned']

/**
 * Narrow the wire's `label`.
 *
 * An unknown label falls back to `unplanned` — the one value that badges
 * nothing. Falling back to `absent` would invent a warning out of a server
 * version this client hasn't caught up with.
 */
function toDayLabel(value: string | null | undefined): DayLabel {
  return DAY_LABELS.includes(value as DayLabel) ? (value as DayLabel) : 'unplanned'
}

/** `pinned` | `rep`, or null when no day row exists for the date. */
function toOrigin(value: string | null | undefined): DayOrigin | null {
  return value === 'pinned' || value === 'rep' ? value : null
}

/** One calendar date of the strip. */
function toStripDay(day: {
  date: string
  label: string
  activity_code?: string | null
  origin?: string | null
  beat_count: number
}): MonthStripDay {
  return {
    date: day.date,
    day: dayOfMonth(day.date),
    label: toDayLabel(day.label),
    activityCode: day.activity_code ?? null,
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
        beat_id: string | null
        beat_name?: string | null
        outlet_count: number | null
        facts?: Record<string, unknown> | null
      }[]
    | null
    | undefined,
): PlanFlag[] {
  return (flags ?? []).map((flag) => ({
    code: flag.code,
    date: flag.date ?? null,
    beatId: flag.beat_id,
    beatName: flag.beat_name ?? null,
    outletCount: flag.outlet_count,
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
    beatsAllocated: row.beats_allocated,
    beatsWorked: row.beats_worked,
    completion: row.completion_percentage,
    workingDays: row.working_days,
    flags: toFlags(row.flags),
    monthStrip: (row.month_strip ?? []).map(toStripDay),
  }
}

/**
 * Translate the list's camelCase params into the endpoint's query string.
 *
 * Deliberately short: there are no status tabs and no flag filters, because
 * nothing has a status to filter by. A worklist is `sort_by=completion&asc`.
 */
function toQueueQuery(params: QueueParams): Record<string, string | number | boolean> {
  const q: Record<string, string | number | boolean> = {
    period_month: params.periodMonth,
  }
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  if (params.city) q.city = params.city
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /journey-plans — one page of the month's allocations. */
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
    throw asApiError(error, 'Failed to load the monthly allocations.')
  }
}

/** Map one allocation in full — the same shape a save answers with. */
function toPlanDetail(r: JourneyPlanDetailRow): JourneyPlanDetail {
  const days: PlanDay[] = (r.days ?? []).map((day) => ({
    id: day.id,
    date: day.date,
    day: dayOfMonth(day.date),
    activityId: day.activity_id ?? 0,
    activityCode: day.activity_code ?? '',
    activityName: day.activity_name ?? '—',
    // A row the server didn't label is the rep's: a pinned date always carries
    // `pinned`, and treating an unlabelled row as pinned would offer the admin an
    // un-pin button that silently un-chooses the rep's morning.
    origin: day.origin === 'pinned' ? 'pinned' : 'rep',
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
    generatedAt: r.generated_at ?? null,
    generatedBy: r.generated_by ?? null,
    allocatedBeats: (r.allocated_beats ?? []).map((beat) => ({
      beatId: beat.beat_id,
      beatName: beat.beat_name ?? `Beat ${beat.beat_id}`,
      source: beat.source === 'manual' ? 'manual' : 'solver',
      outletCount: beat.outlet_count,
      // NOT a target for the month — the allocation carries no per-beat count.
      visitsPerMonth: beat.visits_per_month,
      workedCount: beat.worked_count,
      // Left as strings: these are `numeric` columns, and parsing them here
      // would drop precision before the map's boundary asks for it.
      latitude: beat.latitude,
      longitude: beat.longitude,
    })),
    progress: {
      beatsAllocated: r.beats_allocated,
      beatsWorked: r.beats_worked,
      beatsRemaining: r.beats_remaining,
      completion: r.completion_percentage,
      workingDays: r.working_days,
      capacity: r.capacity,
      totalDays: r.total_days,
    },
    flags: toFlags(r.flags),
    monthStrip: (r.month_strip ?? []).map(toStripDay),
    days,
  }
}

/** GET /journey-plans/{id} — one rep's allocation in full. */
export async function fetchPlan(id: string): Promise<JourneyPlanDetail> {
  try {
    const raw = await http.get<unknown>(endpoints.JOURNEY_PLAN.GET(id))
    return toPlanDetail(journeyPlanDetailSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to load the allocation.')
  }
}

/**
 * PATCH /journey-plans/{id} — the whole admin write surface.
 *
 * Both fields are **full replacements**, not deltas, and both are optional: an
 * omitted field is left alone. Two kinds of day row survive a `pinned_days`
 * replacement whatever we send — a locked day, and a date the rep has already
 * taken over — so the caller must re-read the response rather than assume every
 * pin landed.
 */
export async function savePlan(
  id: string,
  input: SavePlanInput,
): Promise<JourneyPlanDetail> {
  try {
    const raw = await http.patch<unknown>(endpoints.JOURNEY_PLAN.SAVE(id), {
      ...(input.beats
        ? { beats: input.beats.map((beatId) => Number(beatId) || beatId) }
        : {}),
      ...(input.pinnedDays
        ? {
            pinned_days: input.pinnedDays.map((day) => ({
              date: day.date,
              activity_id: day.activityId,
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
 * GET /journey-plans/reps — the rep switcher. Each entry already carries its
 * plan id, so switching rep is a client-side navigation with no extra lookup.
 * Deliberately carries no metrics.
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
    }))
  } catch (error) {
    throw asApiError(error, 'Failed to load the sales incharges for this month.')
  }
}

/** The outcomes the server reports; anything unrecognised reads as a failure. */
const OUTCOMES: GenerateOutcome[] = [
  'created',
  'replaced',
  'skipped_existing',
  'no_beats',
  'failed',
]

function toOutcome(value: string): GenerateOutcome {
  return OUTCOMES.includes(value as GenerateOutcome) ? (value as GenerateOutcome) : 'failed'
}

/**
 * POST /journey-plans/generate — build each rep's beat list for the month, plus
 * the dates pinned for everyone in the run.
 *
 * Idempotent per rep and period: a rep who already has an allocation is skipped
 * unless `replaceExisting` is set. **One rep's failure does not fail the run**,
 * so the caller renders the per-rep results rather than treating `failed > 0` as
 * an error.
 */
export async function generatePlans(input: GenerateInput): Promise<GenerateResult> {
  try {
    const raw = await http.post<unknown>(endpoints.JOURNEY_PLAN.GENERATE, {
      period_month: input.periodMonth,
      ...(input.inchargeIds?.length
        ? { sales_incharge_ids: input.inchargeIds.map((id) => Number(id) || id) }
        : {}),
      ...(input.pinnedDays?.length
        ? {
            pinned_days: input.pinnedDays.map((day) => ({
              date: day.date,
              activity_id: day.activityId,
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
        beatsAllocated: row.beats_allocated,
        message: row.message ?? null,
      })),
      created: res.created,
      skipped: res.skipped,
      failed: res.failed,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to generate the monthly allocations.')
  }
}

/**
 * GET /activities — the activity master behind the pinned-day dropdown. The
 * three booleans are what the screens reason about, so they come through as-is.
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
 * GET /sales-incharges/{id}/beats — every beat allocated to the rep. This is the
 * pool the month's list is chosen *from*: a rep holds 60+ of these and cannot
 * work them all, which is why choosing which is the whole decision.
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
      outlets: beat.outlet_count ?? beat.retailer_count ?? null,
    }))
  } catch (error) {
    throw asApiError(error, "Failed to load the incharge's allocated beats.")
  }
}
