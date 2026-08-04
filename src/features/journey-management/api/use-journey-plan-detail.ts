/**
 * Query + mutation hooks for the allocation editor.
 *
 * The save returns the whole allocation with progress and flags recomputed, so
 * it is written straight into the detail cache (`setQueryData`) instead of
 * invalidating and refetching — the server has already handed us the answer.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchActivities,
  fetchAllocatedBeats,
  fetchPlan,
  fetchPlanReps,
  savePlan,
} from './journey-plan-api'
import type { SavePlanInput } from '../types'

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

/**
 * GET /sales-incharges/{id}/beats — every beat the rep holds. The month's list is
 * chosen from this pool, so it is the editor's left-hand side, not a per-day
 * lookup.
 */
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

/**
 * PATCH /journey-plans/{id} — the one write the editor makes.
 *
 * The response is authoritative: a `pinned_days` replacement cannot move a
 * locked day or a date the rep has already taken over, so the saved allocation
 * may differ from what was sent. Writing it into the cache is what re-syncs the
 * screen with what actually landed.
 */
export function useSaveJourneyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { planId: string } & SavePlanInput) =>
      savePlan(vars.planId, { beats: vars.beats, pinnedDays: vars.pinnedDays }),
    onSuccess: (plan) => {
      qc.setQueryData(queryKeys.journey.plan(plan.id), plan)
      // The list row's progress and flags moved with the save.
      qc.invalidateQueries({ queryKey: queryKeys.journey.plans() })
    },
  })
}
