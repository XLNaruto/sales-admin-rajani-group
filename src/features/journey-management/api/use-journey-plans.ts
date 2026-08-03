/**
 * Query + mutation hooks for the approval queue.
 *
 * The queue is server-filtered, server-sorted and server-paged, and its stat
 * cards come from a `summary` computed over the whole period — so every filter
 * change is a refetch, not a client-side pass over the page.
 */
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  approvePlan,
  bulkApprovePlans,
  fetchPeriodSummary,
  fetchQueue,
  generatePlans,
} from './journey-plan-api'
import type { QueueParams } from '../types'

/** How many clean ids one sweep collects for the bulk-approve button. */
const BULK_PAGE_SIZE = 100

/** GET /journey-plans — one page of the month. */
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
 * GET /journey-plans/summary — the stat cards and the tab badges.
 *
 * Keyed by the period alone, deliberately: the counts ignore the list's filters,
 * so paging or narrowing the table must not refetch this or move its numbers.
 * The mutations invalidate `journey.all`, which covers it after an approve.
 */
export function useJourneyPlanPeriodSummary(
  periodMonth: string,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.journey.planSummary(periodMonth),
    queryFn: () => fetchPeriodSummary(periodMonth),
    // The month is in the key, so a month step would otherwise blank the badges.
    placeholderData: keepPreviousData,
    enabled: Boolean(periodMonth) && (options.enabled ?? true),
  })
}

/**
 * The ids the "Approve N clean" button acts on: pending plans with no flags.
 *
 * Bulk-approve refuses flagged plans, so the count on the button has to be the
 * *approvable* count — which means asking the server for exactly that slice
 * rather than counting what happens to be on the current page.
 */
export function useCleanPendingPlans(
  periodMonth: string,
  options: { enabled?: boolean } = {},
) {
  const params: QueueParams = {
    periodMonth,
    status: 'pending_approval',
    hasFlags: false,
    page: 1,
    pageSize: BULK_PAGE_SIZE,
  }
  return useQuery({
    queryKey: queryKeys.journey.plans(params as unknown as Record<string, unknown>),
    queryFn: () => fetchQueue(params),
    enabled: Boolean(periodMonth) && (options.enabled ?? true),
  })
}

/** POST /journey-plans/{id}/approve. */
export function useApproveJourneyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approvePlan(id),
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: queryKeys.journey.all })
      qc.setQueryData(queryKeys.journey.plan(plan.id), plan)
    },
  })
}

/** POST /journey-plans/bulk-approve — flagged ids come back as `skipped_flagged`. */
export function useBulkApproveJourneyPlans() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => bulkApprovePlans(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journey.all }),
  })
}

/** POST /journey-plans/generate — refuses live plans unless superseding. */
export function useGenerateJourneyPlans() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof generatePlans>[0]) => generatePlans(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journey.all }),
  })
}
