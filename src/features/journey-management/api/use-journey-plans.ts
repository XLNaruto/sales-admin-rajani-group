/**
 * Query + mutation hooks for the plan list.
 *
 * The list is server-filtered, server-sorted and server-paged, so every change
 * is a refetch rather than a client-side pass over the page.
 *
 * There is deliberately no period-summary hook: `GET /journey-plans/summary` is
 * gone — the list's own `status` filter serves the tabs it used to count, and the
 * header's figure is the list's `total` for whichever tab is on.
 */
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { createPlan, fetchQueue } from './journey-plan-api'
import type { CreatePlanInput, QueueParams } from '../types'

/** GET /journey-plans — one page of the month's plans. */
export function useJourneyPlanQueue(
  params: QueueParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.journey.plans(params as unknown as Record<string, unknown>),
    queryFn: () => fetchQueue(params),
    // The month, the filters and the page all live in the key, so a page step
    // would otherwise blank the table between fetches.
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? Boolean(params.periodMonth),
  })
}

/**
 * POST /journey-plans — opens ONE empty draft for one sales incharge and month.
 *
 * The response is the plan itself, so it is written straight into the detail
 * cache: the screen the admin is about to open already has it.
 *
 * Invalidates the whole `journey` tree rather than the list alone, because the
 * period's sales-incharge switcher gains an entry too.
 */
export function useCreateJourneyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePlanInput) => createPlan(input),
    onSuccess: (plan) => {
      qc.setQueryData(queryKeys.journey.plan(plan.id), plan)
      qc.invalidateQueries({ queryKey: queryKeys.journey.all })
    },
  })
}
