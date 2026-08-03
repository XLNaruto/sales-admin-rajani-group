/**
 * Query + mutation hooks for the plan detail screen.
 *
 * Every edit returns the whole plan, so each mutation writes the response
 * straight into the detail cache (`setQueryData`) instead of invalidating and
 * refetching — the server has already recomputed coverage and flags, and a
 * refetch would only re-fetch what it just handed us.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  addPlanDayBeat,
  fetchActivities,
  fetchAllocatedBeats,
  fetchPlan,
  fetchPlanReps,
  removePlanDayBeat,
  reSolvePlan,
  updatePlanDay,
} from './journey-plan-api'
import type { JourneyPlanDetail } from '../types'

/** GET /journey-plans/{id}. */
export function useJourneyPlanDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.journey.plan(id ?? ''),
    queryFn: () => fetchPlan(id as string),
    enabled: Boolean(id),
  })
}

/** GET /journey-plans/reps — the rep switcher for a `yyyy-MM` period. */
export function useJourneyPlanReps(periodMonth: string) {
  return useQuery({
    queryKey: queryKeys.journey.reps(periodMonth),
    queryFn: () => fetchPlanReps(periodMonth),
    enabled: Boolean(periodMonth),
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

/** GET /sales-incharges/{id}/beats — the beats a day may be filled with. */
export function useAllocatedBeats(
  inchargeId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.beatAllocation.allocated(inchargeId ?? '', { pageSize: 100 }),
    queryFn: () => fetchAllocatedBeats(inchargeId as string),
    enabled: Boolean(inchargeId) && (options.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  })
}

/** Shared success path for the three day-level edits. */
function useDayEdit<TVars>(
  mutationFn: (vars: TVars) => Promise<JourneyPlanDetail>,
  planIdOf: (vars: TVars) => string,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (plan, vars) => {
      qc.setQueryData(queryKeys.journey.plan(plan.id), plan)
      // The queue row's coverage and flag count moved with the edit.
      qc.invalidateQueries({ queryKey: queryKeys.journey.plans() })
      const previousId = planIdOf(vars)
      if (previousId !== plan.id) {
        qc.invalidateQueries({ queryKey: queryKeys.journey.plan(previousId) })
      }
    },
  })
}

/**
 * PATCH a day's activity. Switching to a beatless activity clears the day's
 * beats server-side, which the returned plan already reflects.
 */
export function useUpdatePlanDay() {
  return useDayEdit(
    (vars: {
      planId: string
      dayId: string
      activityId: number
      reason?: string | null
      jointWorkingInchargeId?: string | null
    }) =>
      updatePlanDay(vars.planId, vars.dayId, {
        activityId: vars.activityId,
        reason: vars.reason,
        jointWorkingInchargeId: vars.jointWorkingInchargeId,
      }),
    (vars) => vars.planId,
  )
}

/** POST a beat onto a day — 409 on a duplicate, a second full day or the cap. */
export function useAddPlanDayBeat() {
  return useDayEdit(
    (vars: { planId: string; dayId: string; beatId: string }) =>
      addPlanDayBeat(vars.planId, vars.dayId, vars.beatId),
    (vars) => vars.planId,
  )
}

/** DELETE a beat from a day. */
export function useRemovePlanDayBeat() {
  return useDayEdit(
    (vars: { planId: string; dayId: string; beatId: string }) =>
      removePlanDayBeat(vars.planId, vars.dayId, vars.beatId),
    (vars) => vars.planId,
  )
}

/**
 * POST /journey-plans/{id}/re-solve.
 *
 * The plan is superseded: the result carries a NEW id, so the caller must move
 * the route there. The diff is returned alongside so it can be shown before the
 * new month replaces the view.
 */
export function useReSolvePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { planId: string; pinnedDates?: string[]; seed?: string }) =>
      reSolvePlan(vars.planId, { pinnedDates: vars.pinnedDates, seed: vars.seed }),
    onSuccess: (result, vars) => {
      qc.setQueryData(queryKeys.journey.plan(result.plan.id), result.plan)
      // The old id is now `superseded`; drop it rather than leave stale days cached.
      qc.removeQueries({ queryKey: queryKeys.journey.plan(vars.planId) })
      qc.invalidateQueries({ queryKey: queryKeys.journey.plans() })
      // The rep switcher carries plan ids, so it points at the superseded one until
      // it is refetched — which is exactly what a month step would then resolve from.
      qc.invalidateQueries({ queryKey: queryKeys.journey.reps(result.plan.month) })
    },
  })
}
