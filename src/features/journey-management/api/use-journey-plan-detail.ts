/**
 * Query + mutation hooks for one sales incharge's month.
 *
 * Both writes and both transitions answer with authoritative state, so each one
 * writes straight into the detail cache instead of invalidating and refetching —
 * the server has already handed us the answer. The two transitions only carry a
 * receipt rather than the whole plan, so those invalidate the detail as well.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  approvePlan,
  fetchActivities,
  fetchAllocatedBeats,
  fetchAllocationOptions,
  fetchPlan,
  fetchPlanReps,
  publishPlan,
  saveAllocation,
  saveSchedule,
} from './journey-plan-api'
import type { SaveAllocationInput, SaveScheduleInput } from '../types'

/** GET /journey-plans/{id}. */
export function useJourneyPlanDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.journey.plan(id ?? ''),
    queryFn: () => fetchPlan(id as string),
    enabled: Boolean(id),
  })
}

/** GET /journey-plans/reps — the sales incharge switcher for a `yyyy-MM` period. */
export function useJourneyPlanReps(periodMonth: string) {
  return useQuery({
    queryKey: queryKeys.journey.reps(periodMonth),
    queryFn: () => fetchPlanReps(periodMonth),
    enabled: Boolean(periodMonth),
  })
}

/**
 * GET /journey-plans/allocation-options — the allocatable activities and the
 * distributors the sales incharge's beats reach.
 *
 * Keyed by (sales incharge, period) and **not** by plan id, because it needs no plan to
 * exist: the admin opens it to build the month. Short stale time on purpose — the
 * distributors follow the sales incharge's beat allocation, which another screen can change.
 */
export function useAllocationOptions(
  inchargeId: string | undefined,
  periodMonth: string,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.journey.allocationOptions(inchargeId ?? '', periodMonth),
    queryFn: () => fetchAllocationOptions(inchargeId as string, periodMonth),
    enabled: Boolean(inchargeId) && Boolean(periodMonth) && (options.enabled ?? true),
    staleTime: 2 * 60 * 1000,
  })
}

/** GET /activities — cached hard: the master changes about never. Needs `activity:list`. */
export function useActivities(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.journey.activities(),
    queryFn: fetchActivities,
    staleTime: 10 * 60 * 1000,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharges/{id}/beats — every beat the sales incharge holds, each
 * with the distributors it serves.
 *
 * The correction pass filters this by the entry's distributor, because a beat may
 * only go on an entry whose distributor it serves.
 */
export function useAllocatedBeats(
  inchargeId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.beatAllocation.allocated(inchargeId ?? '', {
      pageSize: 100,
    }),
    queryFn: () => fetchAllocatedBeats(inchargeId as string),
    enabled: Boolean(inchargeId) && (options.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * PATCH /journey-plans/{id} — the allocation, as day-counts.
 *
 * The response is authoritative: `days_scheduled` per bucket, the variance and
 * `can_publish` all move with the save, so writing it into the cache is what
 * re-syncs the screen. Refused (409) once the plan is `approved`.
 */
export function useSaveAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { planId: string } & SaveAllocationInput) =>
      saveAllocation(vars.planId, {
        activityAllocations: vars.activityAllocations,
        distributorAllocations: vars.distributorAllocations,
      }),
    onSuccess: (plan) => {
      qc.setQueryData(queryKeys.journey.plan(plan.id), plan)
      // The list row's counts and flags moved with the save.
      qc.invalidateQueries({ queryKey: queryKeys.journey.plans() })
    },
  })
}

/**
 * PATCH /journey-plans/{id}/schedule — the correction pass.
 *
 * A full replacement, and **locked dates are skipped rather than rejected**, so
 * the saved plan can differ from what was sent. Writing the response into the
 * cache is what shows the admin what actually landed.
 */
export function useSaveSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { planId: string } & SaveScheduleInput) =>
      saveSchedule(vars.planId, { days: vars.days }),
    onSuccess: (plan) => {
      qc.setQueryData(queryKeys.journey.plan(plan.id), plan)
      qc.invalidateQueries({ queryKey: queryKeys.journey.plans() })
    },
  })
}

/**
 * POST /journey-plans/{id}/publish — `draft` → `published`.
 *
 * The receipt carries only the status and two counts, so the detail is
 * invalidated rather than written: publishing changes `days`, the flags
 * (`awaiting_schedule` appears) and every `can_*` verdict.
 *
 * The sales incharge switcher carries each plan's status too, so it goes with it.
 */
export function usePublishJourneyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => publishPlan(planId),
    onSuccess: (result) => {
      qc.invalidateQueries({
        queryKey: queryKeys.journey.plan(result.journeyPlanId),
      })
      qc.invalidateQueries({ queryKey: queryKeys.journey.plans() })
      qc.invalidateQueries({ queryKey: queryKeys.journey.all, exact: false })
    },
  })
}

/**
 * POST /journey-plans/{id}/approve — `submitted` → `approved`.
 *
 * The counts are not re-checked — a variance is a flag, not a refusal. Nothing
 * goes backwards afterwards: the admin may still correct the calendar, and that
 * does not reopen the cycle.
 */
export function useApproveJourneyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => approvePlan(planId),
    onSuccess: (result) => {
      qc.invalidateQueries({
        queryKey: queryKeys.journey.plan(result.journeyPlanId),
      })
      qc.invalidateQueries({ queryKey: queryKeys.journey.plans() })
      qc.invalidateQueries({ queryKey: queryKeys.journey.all, exact: false })
    },
  })
}
