/**
 * Query + mutation hooks for the allocation list.
 *
 * The list is server-filtered, server-sorted and server-paged, so every change
 * is a refetch rather than a client-side pass over the page.
 *
 * There is deliberately no period-summary hook: `GET /journey-plans/summary` is
 * gone, because every count it returned was by approval status and an allocation
 * has none. The header's figure is the list's own `total`.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchQueue, generatePlans } from './journey-plan-api'
import type { GenerateInput, QueueParams } from '../types'

/** GET /journey-plans — one page of the month's allocations. */
export function useJourneyPlanQueue(params: QueueParams, options: { enabled?: boolean } = {}) {
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
 * POST /journey-plans/generate — skips a rep who already has an allocation
 * unless `replaceExisting` is set.
 *
 * Invalidates the whole `journey` tree rather than the list alone: a replaced rep
 * has a new beat list, so any detail already in cache is stale too.
 */
export function useGenerateJourneyPlans() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GenerateInput) => generatePlans(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journey.all }),
  })
}
