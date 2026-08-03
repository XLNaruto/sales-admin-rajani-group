/**
 * Journey-plan fetchers. Every response is zod-parsed and mapped into the
 * feature's camelCase domain types here, so no component ever sees a snake_case
 * field or an unvalidated body.
 *
 * Each edit returns the *whole* plan detail, so callers replace their state
 * wholesale rather than reconciling a patch — that is deliberate on the server's
 * side, because coverage and flags are recomputed on every write.
 */
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import {
  activityListSchema,
  allocatedBeatListSchema,
  bulkApproveSchema,
  generateSchema,
  journeyPlanDetailSchema,
  journeyPlanListSchema,
  planRepsSchema,
  queueSummarySchema,
  reSolveSchema,
  type JourneyPlanDetailRow,
  type JourneyPlanRow,
} from '../schemas'
import { dayOfMonth, monthOf } from '../lib/journey-format'
import type {
  ActivityDef,
  AllocatedBeat,
  ApprovalStatus,
  BulkApproveResult,
  GenerateResult,
  JourneyPlan,
  JourneyPlanDetail,
  PlanDay,
  PlanRepOption,
  QueueParams,
  QueuePeriodSummary,
  QueueResult,
  ReSolveResult,
} from '../types'

/** The lifecycle states the server actually sends; anything else reads as draft. */
const STATUSES: ApprovalStatus[] = ['draft', 'pending_approval', 'approved', 'superseded']

function toStatus(value: string | null | undefined): ApprovalStatus {
  return STATUSES.includes(value as ApprovalStatus) ? (value as ApprovalStatus) : 'draft'
}

/** Map a queue row, keeping every calendar day of the rhythm strip. */
function toPlanRow(row: JourneyPlanRow): JourneyPlan {
  return {
    id: row.id,
    inchargeId: row.sales_incharge_id ?? '',
    inchargeName: row.sales_incharge_name ?? '—',
    employeeCode: row.sales_incharge_code ?? '',
    headquarter: row.sales_incharge_city ?? '—',
    status: toStatus(row.status),
    coverage: row.coverage_percentage,
    workingDays: row.working_days,
    beats: row.beats_scheduled,
    flagCount: row.flag_count,
    flagCodes: row.flag_codes ?? [],
    rhythm: (row.month_rhythm ?? []).map((day) => ({
      date: day.date,
      day: dayOfMonth(day.date),
      activityCode: day.activity_code ?? null,
      beatCount: day.beat_count,
      flagged: Boolean(day.flagged),
    })),
  }
}

/** Translate the queue's camelCase params into the endpoint's query string. */
function toQueueQuery(params: QueueParams): Record<string, string | number | boolean> {
  const q: Record<string, string | number | boolean> = {
    period_month: params.periodMonth,
  }
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  if (params.status) q.status = params.status
  if (params.hasFlags != null) q.has_flags = params.hasFlags
  if (params.city) q.city = params.city
  if (params.flagCode) q.flag_code = params.flagCode
  if (params.coverageMin != null) q.coverage_min = params.coverageMin
  if (params.coverageMax != null) q.coverage_max = params.coverageMax
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /journey-plans — one page of the month's plans, filtered and sorted. */
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
    throw asApiError(error, 'Failed to load the approval queue.')
  }
}

/**
 * GET /journey-plans/summary — the period's counts and the filter panel's
 * options.
 *
 * This is a separate request from the list on purpose: the server computes it
 * over the WHOLE period and ignores the list's filters, which is what keeps a
 * tab badge honest after that tab has been clicked and narrowed the table.
 */
export async function fetchPeriodSummary(periodMonth: string): Promise<QueuePeriodSummary> {
  try {
    const raw = await http.get<unknown>(endpoints.JOURNEY_PLAN.SUMMARY, {
      params: { period_month: periodMonth },
    })
    const s = queueSummarySchema.parse(raw)
    return {
      summary: {
        total: s.total_plans,
        avgCoverage: s.average_coverage,
        clean: s.clean_plans,
        needsLook: s.flagged_plans,
        approved: s.approved_plans,
        pending: s.pending_approval_plans,
        draft: s.draft_plans,
        reviewedPercentage: s.reviewed_percentage,
        generatedAt: s.generated_at ?? null,
      },
      filterOptions: {
        cities: s.filter_options?.cities ?? [],
        flagCodes: s.filter_options?.flag_codes ?? [],
      },
    }
  } catch (error) {
    throw asApiError(error, "Failed to load the period's summary.")
  }
}

/** Map the plan detail, including the day rows the editor addresses by id. */
function toPlanDetail(r: JourneyPlanDetailRow): JourneyPlanDetail {
  const days: PlanDay[] = (r.days ?? []).map((day) => ({
    id: day.id,
    date: day.date,
    day: dayOfMonth(day.date),
    sequence: day.sequence,
    activityId: day.activity_id ?? 0,
    activityCode: day.activity_code ?? '',
    activityName: day.activity_name ?? '—',
    beats: (day.beats ?? []).map((beat) => ({
      id: beat.id,
      beatId: beat.beat_id,
      beatName: beat.beat_name ?? `Beat ${beat.beat_id}`,
      workload: beat.workload ?? 'full_day',
      source: beat.source ?? '',
      sequence: beat.sequence,
      stopCount: beat.stop_count,
      locked: Boolean(beat.locked),
    })),
    jointWorkingInchargeId: day.joint_working_sales_incharge_id,
    jointWorkingInchargeName: day.joint_working_sales_incharge_name ?? null,
    reason: day.reason ?? null,
    locked: Boolean(day.locked),
    lockedAt: day.locked_at ?? null,
    solverReason: day.solver_reason
      ? { rule: day.solver_reason.rule, facts: day.solver_reason.facts ?? {} }
      : null,
  }))

  return {
    id: r.id,
    inchargeId: r.sales_incharge_id ?? '',
    inchargeName: r.sales_incharge_name ?? '—',
    employeeCode: r.sales_incharge_code ?? '',
    headquarter: r.sales_incharge_city ?? '—',
    month: monthOf(r.period_month),
    status: toStatus(r.status),
    generatedAt: r.generated_at ?? null,
    generatedBy: r.generated_by ?? null,
    metrics: {
      coverage: r.coverage_percentage,
      beatsScheduled: r.beats_scheduled,
      workingDays: r.working_days,
      totalDays: r.total_days,
      plannedTravelKm: r.planned_travel_km,
      // Passed through as null — the screen must render "—", not "0 km".
      avgKmPerDay: r.avg_km_per_day,
    },
    flags: (r.flags ?? []).map((flag) => ({
      code: flag.code,
      date: flag.date ?? null,
      beatId: flag.beat_id,
      beatName: flag.beat_name ?? null,
      outletCount: flag.outlet_count,
      facts: flag.facts ?? {},
    })),
    flagSummary: r.flag_summary
      ? {
          remainingCount: r.flag_summary.remaining_count,
          remainingBeatCount: r.flag_summary.remaining_beat_count,
          remainingOutletCount: r.flag_summary.remaining_outlet_count,
        }
      : null,
    flagCount: r.flag_count,
    days,
  }
}

/** GET /journey-plans/{id} — one rep's month in full. */
export async function fetchPlan(id: string): Promise<JourneyPlanDetail> {
  try {
    const raw = await http.get<unknown>(endpoints.JOURNEY_PLAN.GET(id))
    return toPlanDetail(journeyPlanDetailSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to load the journey plan.')
  }
}

/**
 * GET /journey-plans/reps — the rep switcher. Each entry already carries its
 * plan id, so switching rep is a client-side navigation with no extra lookup.
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
      status: rep.status ? toStatus(rep.status) : null,
    }))
  } catch (error) {
    throw asApiError(error, 'Failed to load the sales incharges for this month.')
  }
}

/** POST /journey-plans/{id}/approve — returns the approved plan. */
export async function approvePlan(id: string): Promise<JourneyPlanDetail> {
  try {
    const raw = await http.post<unknown>(endpoints.JOURNEY_PLAN.APPROVE(id))
    return toPlanDetail(journeyPlanDetailSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to approve the journey plan.')
  }
}

/**
 * POST /journey-plans/bulk-approve — **refuses flagged plans**, which is what
 * makes the button "Approve N *clean*". Reports one outcome per id.
 */
export async function bulkApprovePlans(ids: string[]): Promise<BulkApproveResult> {
  try {
    const raw = await http.post<unknown>(endpoints.JOURNEY_PLAN.BULK_APPROVE, {
      journey_plan_ids: ids.map((id) => Number(id) || id),
    })
    const res = bulkApproveSchema.parse(raw)
    return {
      approved: res.approved,
      skipped: res.skipped,
      outcomes: (res.results ?? []).map((row) => ({
        journeyPlanId: row.journey_plan_id,
        outcome: row.outcome as BulkApproveResult['outcomes'][number]['outcome'],
      })),
    }
  } catch (error) {
    throw asApiError(error, 'Failed to approve the clean plans.')
  }
}

/**
 * POST /journey-plans/generate — idempotent per rep and period: it refuses when
 * a live plan exists unless `supersedeExisting` is explicitly true.
 */
export async function generatePlans(input: {
  periodMonth: string
  inchargeIds?: string[]
  supersedeExisting?: boolean
  seed?: string
}): Promise<GenerateResult> {
  try {
    const raw = await http.post<unknown>(endpoints.JOURNEY_PLAN.GENERATE, {
      period_month: input.periodMonth,
      ...(input.inchargeIds?.length
        ? { sales_incharge_ids: input.inchargeIds.map((id) => Number(id) || id) }
        : {}),
      ...(input.supersedeExisting != null
        ? { supersede_existing: input.supersedeExisting }
        : {}),
      ...(input.seed ? { seed: input.seed } : {}),
    })
    const res = generateSchema.parse(raw)
    return {
      outcomes: (res.results ?? []).map((row) => ({
        inchargeId: row.sales_incharge_id ?? '',
        outcome: row.outcome as GenerateResult['outcomes'][number]['outcome'],
        journeyPlanId: row.journey_plan_id,
      })),
    }
  } catch (error) {
    throw asApiError(error, 'Failed to generate the journey plans.')
  }
}

/**
 * PATCH /journey-plans/{id}/days/{dayId} — change the day's activity.
 *
 * Switching to a beatless activity clears the day's beats **server-side**, which
 * is why the whole plan comes back: refetch rather than reconcile.
 */
export async function updatePlanDay(
  id: string,
  dayId: string,
  input: { activityId: number; reason?: string | null; jointWorkingInchargeId?: string | null },
): Promise<JourneyPlanDetail> {
  try {
    const raw = await http.patch<unknown>(endpoints.JOURNEY_PLAN.DAY(id, dayId), {
      activity_id: input.activityId,
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.jointWorkingInchargeId !== undefined
        ? {
            joint_working_sales_incharge_id:
              input.jointWorkingInchargeId == null
                ? null
                : Number(input.jointWorkingInchargeId) || input.jointWorkingInchargeId,
          }
        : {}),
    })
    return toPlanDetail(journeyPlanDetailSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to update the day.')
  }
}

/** POST /journey-plans/{id}/days/{dayId}/beats — schedule one more beat. */
export async function addPlanDayBeat(
  id: string,
  dayId: string,
  beatId: string,
): Promise<JourneyPlanDetail> {
  try {
    const raw = await http.post<unknown>(endpoints.JOURNEY_PLAN.DAY_BEATS(id, dayId), {
      beat_id: Number(beatId) || beatId,
    })
    return toPlanDetail(journeyPlanDetailSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to add the beat.')
  }
}

/** DELETE /journey-plans/{id}/days/{dayId}/beats/{beatId}. */
export async function removePlanDayBeat(
  id: string,
  dayId: string,
  beatId: string,
): Promise<JourneyPlanDetail> {
  try {
    const raw = await http.delete<unknown>(
      endpoints.JOURNEY_PLAN.DAY_BEAT(id, dayId, beatId),
    )
    // The DELETE answers `{ success: true }` on some builds and the updated plan
    // on others; parse when it is a plan, and let the caller refetch otherwise.
    const parsed = journeyPlanDetailSchema.safeParse(raw)
    if (parsed.success) return toPlanDetail(parsed.data)
    return await fetchPlan(id)
  } catch (error) {
    throw asApiError(error, 'Failed to remove the beat.')
  }
}

/**
 * POST /journey-plans/{id}/re-solve — replans the month around the days held.
 *
 * `pinnedDates` are days the admin hand-edited and wants kept; **locked days are
 * held regardless** and count into `daysHeld`. This SUPERSEDES the plan, so the
 * returned plan carries a NEW id — update the route params from it.
 */
export async function reSolvePlan(
  id: string,
  input: { pinnedDates?: string[]; seed?: string } = {},
): Promise<ReSolveResult> {
  try {
    const raw = await http.post<unknown>(endpoints.JOURNEY_PLAN.RE_SOLVE(id), {
      ...(input.pinnedDates?.length ? { pinned_dates: input.pinnedDates } : {}),
      ...(input.seed ? { seed: input.seed } : {}),
    })
    const res = reSolveSchema.parse(raw)
    return {
      plan: toPlanDetail(res.journey_plan),
      diff: {
        entries: (res.diff?.entries ?? []).map((entry) => ({
          date: entry.date,
          removedBeatIds: entry.removed_beat_ids ?? [],
          addedBeatIds: entry.added_beat_ids ?? [],
          activityChanged: Boolean(entry.activity_changed),
        })),
        daysChanged: res.diff?.days_changed ?? 0,
        beatsMoved: res.diff?.beats_moved ?? 0,
        daysHeld: res.diff?.days_held ?? 0,
      },
    }
  } catch (error) {
    throw asApiError(error, 'Failed to re-solve the month.')
  }
}

/**
 * GET /activities — the activity master behind the day dropdown. The three
 * booleans are what the editor reasons about, so they come through as-is.
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
 * GET /sales-incharges/{id}/beats — the rep's allocated beats, i.e. the pool a
 * day's beat picker may offer and the denominator coverage is measured against.
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
