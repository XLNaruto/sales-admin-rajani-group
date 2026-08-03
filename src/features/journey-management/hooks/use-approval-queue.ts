/**
 * State for the Approval Queue screen.
 *
 * Everything the toolbar owns — the month, the slice, the filters, the page and
 * the sort — is a query param, so each change is one refetch rather than a
 * client-side pass over the page.
 *
 * Two requests, on purpose: the list returns the page, and `/journey-plans/summary`
 * returns the period's counts. The second is keyed by the month alone and ignores
 * the filters, which is what keeps the tab badges and the stat cards steady —
 * "43 awaiting review" must not become "12" the moment the tab is clicked.
 */
import { useCallback, useMemo, useState } from 'react'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { toastsuccessmsg } from '@/lib/toast'
import { toastApiError } from '@/lib/api-toast'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useCan } from '@/features/permissions'
import {
  useApproveJourneyPlan,
  useBulkApproveJourneyPlans,
  useCleanPendingPlans,
  useGenerateJourneyPlans,
  useJourneyPlanPeriodSummary,
  useJourneyPlanQueue,
} from '../api/use-journey-plans'
import { currentMonth, monthLabel, shiftMonth } from '../lib/journey-format'
import { coverageRange, segmentQuery, SORT_COLUMNS } from '../lib/journey-metrics'
import type { JourneyPlan, QueueParams, QueueSegment } from '../types'

/** Filters the queue toolbar owns. `all` means "not applied". */
export interface QueueFilters {
  search: string
  /** Coverage band — translated to `coverage_min`/`coverage_max`. */
  coverage: string
  /** Territory, matched exactly by the API's `city` param. */
  headquarter: string
  /** A single flag code, e.g. `beat_under_covered`. */
  flagCode: string
}

const EMPTY_FILTERS: QueueFilters = {
  search: '',
  coverage: 'all',
  headquarter: 'all',
  flagCode: 'all',
}

const DEFAULT_PAGE_SIZE = 10

export function useApprovalQueue() {
  const { can } = useCan()
  // Reading the queue and acting on it are separate grants: a reviewer may hold
  // `journey-plan:list` and neither of the write keys.
  const canApprove = can('journey-plan:approve')
  const canGenerate = can('journey-plan:create')

  const [month, setMonth] = useState(currentMonth)
  const [segment, setSegment] = useState<QueueSegment>('all')
  const [filters, setFilters] = useState<QueueFilters>(EMPTY_FILTERS)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })
  const [sorting, setSorting] = useState<SortingState>([])

  const search = useDebouncedValue(filters.search)

  const params = useMemo<QueueParams>(() => {
    const sort = sorting[0]
    return {
      periodMonth: month,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: search.trim() || undefined,
      city: filters.headquarter === 'all' ? undefined : filters.headquarter,
      flagCode: filters.flagCode === 'all' ? undefined : filters.flagCode,
      ...coverageRange(filters.coverage),
      ...segmentQuery(segment),
      ...(sort && SORT_COLUMNS[sort.id]
        ? { sortBy: SORT_COLUMNS[sort.id], sortOrder: sort.desc ? ('desc' as const) : ('asc' as const) }
        : {}),
    }
  }, [month, pagination, search, filters, segment, sorting])

  const queue = useJourneyPlanQueue(params)
  /** The period's counts — one request per month, independent of the filters. */
  const period = useJourneyPlanPeriodSummary(month)
  /**
   * The approvable slice, asked for separately — bulk-approve refuses flags. Not
   * fetched at all without the approve grant: it exists only to size that button.
   */
  const clean = useCleanPendingPlans(month, { enabled: canApprove })

  const approve = useApproveJourneyPlan()
  const bulkApprove = useBulkApproveJourneyPlans()
  const generate = useGenerateJourneyPlans()

  const summary = period.data?.summary
  const filterOptions = period.data?.filterOptions

  /** Counts on the segment control — the period-wide figures, not the page's. */
  const segmentCounts = useMemo(
    () => ({
      all: summary?.total ?? 0,
      pending: summary?.pending ?? 0,
      clean: summary?.clean ?? 0,
      'needs-look': summary?.needsLook ?? 0,
      approved: summary?.approved ?? 0,
    }),
    [summary],
  )

  // `refetch` is stable per query, so the toolbar's button keeps its identity.
  const refetchQueue = queue.refetch
  const refetchPeriod = period.refetch
  const refreshAll = useCallback(() => {
    void refetchQueue()
    void refetchPeriod()
  }, [refetchQueue, refetchPeriod])

  /** Any filter change resets to page 1 — page 4 of a narrower list is empty. */
  const patchFilters = useCallback((patch: Partial<QueueFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const selectSegment = useCallback((next: QueueSegment) => {
    setSegment(next)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const selectMonth = useCallback((next: string) => {
    setMonth(next)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const approvePlan = useCallback(
    (plan: JourneyPlan) => {
      if (!canApprove) return
      approve.mutate(plan.id, {
        onSuccess: () => toastsuccessmsg(`${plan.inchargeName}'s plan approved.`),
        // Every 409 here carries a message written to be shown verbatim — a
        // locked day, an already-approved plan, a superseded one.
        onError: (error) => toastApiError(error, 'Failed to approve the plan.'),
      })
    },
    [approve, canApprove],
  )

  const cleanIds = useMemo(
    () => (clean.data?.rows ?? []).map((plan) => plan.id),
    [clean.data],
  )

  const approveAllClean = useCallback(() => {
    if (!canApprove || !cleanIds.length) return
    bulkApprove.mutate(cleanIds, {
      onSuccess: (result) => {
        toastsuccessmsg(
          result.skipped > 0
            ? `Approved ${result.approved} clean plans — ${result.skipped} were skipped.`
            : `Approved ${result.approved} clean plans.`,
        )
      },
      onError: (error) => toastApiError(error, 'Failed to approve the clean plans.'),
    })
  }, [bulkApprove, cleanIds, canApprove])

  /**
   * Generate the month for every rep who has no live plan yet. Idempotent per rep
   * and period: the server refuses anyone who already has one rather than quietly
   * replacing it, and reports why per rep.
   */
  const generatePlans = useCallback(() => {
    if (!canGenerate) return
    generate.mutate(
      { periodMonth: month },
      {
        onSuccess: (result) => {
          const created = result.outcomes.filter((o) => o.outcome === 'created').length
          const skipped = result.outcomes.length - created
          const noBeats = result.outcomes.filter((o) => o.outcome === 'no_beats').length
          toastsuccessmsg(
            created
              ? `Generated ${created} plan${created === 1 ? '' : 's'}${
                  skipped ? ` — ${skipped} skipped` : ''
                }${noBeats ? ` (${noBeats} with no allocated beats)` : ''}.`
              : 'Nothing to generate — every sales incharge already has a plan for this month.',
          )
        },
        onError: (error) => toastApiError(error, 'Failed to generate the plans.'),
      },
    )
  }, [generate, month, canGenerate])

  return {
    month,
    monthLabel: monthLabel(month),
    goPrevMonth: () => selectMonth(shiftMonth(month, -1)),
    goNextMonth: () => selectMonth(shiftMonth(month, 1)),
    selectMonth,
    rows: queue.data?.rows ?? [],
    summary,
    /** Rows matching the current filters — the table's `rowCount`. */
    total: queue.data?.total ?? 0,
    /** Every plan in the period, ignoring the filters — the header's count. */
    periodTotal: summary?.total ?? 0,
    isLoading: queue.isLoading,
    isFetching: queue.isFetching || period.isFetching,
    error: queue.error ?? period.error,
    /** Refresh both: the page and the counts above it move together. */
    refetch: refreshAll,
    /** Last successful fetch, for the toolbar's "Fetched x ago". */
    updatedAt: queue.dataUpdatedAt,
    segment,
    setSegment: selectSegment,
    segmentCounts,
    filters,
    patchFilters,
    resetFilters,
    hasActiveFilters:
      filters.search.trim() !== '' ||
      filters.coverage !== 'all' ||
      filters.headquarter !== 'all' ||
      filters.flagCode !== 'all',
    /** Computed before filtering, so the panel never shrinks as the user narrows. */
    headquarters: filterOptions?.cities ?? [],
    flagCodes: filterOptions?.flagCodes ?? [],
    pagination,
    setPagination,
    sorting,
    setSorting,
    approvePlan,
    isApproving: approve.isPending,
    approveAllClean,
    isBulkApproving: bulkApprove.isPending,
    cleanCount: cleanIds.length,
    generatePlans,
    isGenerating: generate.isPending,
    /** Permission gates for the header actions and the row's approve button. */
    canApprove,
    canGenerate,
  }
}
