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
import { fetchQueue, generatePlans } from './journey-plan-api'
import type { GenerateInput, QueueParams } from '../types'

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
 * POST /journey-plans/generate — drafts each sales incharge's month.
 *
 * Skips a sales incharge who already has a plan unless `replaceExisting` is set, and skips
 * one whose plan has left `draft` **either way** (`skipped_in_progress`) —
 * regenerating would discard the schedule he wrote.
 *
 * Invalidates the whole `journey` tree rather than the list alone: a replaced sales incharge
 * has a new allocation, so any detail already in cache is stale too.
 */
export function useGenerateJourneyPlans() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GenerateInput) => generatePlans(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journey.all }),
  })
}
