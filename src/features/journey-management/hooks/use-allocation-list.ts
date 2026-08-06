/**
 * State for the Journey Plans screen — one row per sales incharge for a month.
 *
 * Everything the toolbar owns — the month, the chain tab, the search, the page and
 * the sort — is a query param, so each change is one refetch rather than a
 * client-side pass over the page.
 *
 * **One request, not five.** `GET /journey-plans/summary` is gone: every count it
 * returned was per status, and the list's own `status` filter serves the tabs it
 * used to badge. The header's figure is the list's `total` for whichever tab is on.
 */
import { useCallback, useMemo, useState } from 'react'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { toastsuccessmsg } from '@/lib/toast'
import { toastApiError } from '@/lib/api-toast'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useCan } from '@/features/permissions'
import { useGenerateJourneyPlans, useJourneyPlanQueue } from '../api/use-journey-plans'
import { useActivities } from '../api/use-journey-plan-detail'
import { currentMonth, monthLabel, shiftMonth } from '../lib/journey-format'
import { SORT_COLUMNS } from '../lib/journey-metrics'
import type { ActivityQuota, PlanStatus, QueueParams } from '../types'

/** Filters the toolbar owns. `status: null` is the "All" tab. */
export interface AllocationFilters {
  search: string
  status: PlanStatus | null
}

const EMPTY_FILTERS: AllocationFilters = { search: '', status: null }

const DEFAULT_PAGE_SIZE = 5

export function useAllocationList() {
  const { can } = useCan()
  // Reading the list and generating a month are separate grants: a reviewer may
  // hold `journey-plan:list` and neither write key.
  const canGenerate = can('journey-plan:create')

  const [month, setMonth] = useState(currentMonth)
  const [filters, setFilters] = useState<AllocationFilters>(EMPTY_FILTERS)
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
      ...(filters.status ? { status: filters.status } : {}),
      search: search.trim() || undefined,
      ...(sort && SORT_COLUMNS[sort.id]
        ? {
            sortBy: SORT_COLUMNS[sort.id],
            sortOrder: sort.desc ? ('desc' as const) : ('asc' as const),
          }
        : {}),
    }
  }, [month, pagination, search, sorting, filters.status])

  const queue = useJourneyPlanQueue(params)

  /**
   * The activity master, for the generate dialog's activity column. Not fetched
   * without the grant to generate — nothing else on this screen reads it.
   */
  const activities = useActivities({
    enabled: canGenerate && can('activity:list'),
  })

  const generate = useGenerateJourneyPlans()

  // `refetch` is stable per query, so the toolbar's button keeps its identity.
  const refetch = queue.refetch

  /** Any filter change resets to page 1 — page 4 of a narrower list is empty. */
  const patchFilters = useCallback((patch: Partial<AllocationFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const selectMonth = useCallback((next: string) => {
    setMonth(next)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  /**
   * Generate the month. Every plan lands as a **draft**, invisible to the sales incharge.
   *
   * Idempotent per sales incharge and period: a sales incharge who already has a plan is skipped unless
   * `replaceExisting` is set, and one whose plan has left `draft` is skipped
   * **either way** — regenerating would discard the schedule he wrote.
   *
   * **A non-zero `failed` is not a failed run** — the endpoint answers 201 either
   * way. With no per sales incharge receipt on screen, the toast is the only report there is,
   * so it names every outcome that isn't a plain success separately rather than
   * folding them into one total. `skipped_in_progress` in particular has to be said
   * out loud: it is the one case `replaceExisting` does not override.
   *
   * `onDone` fires only on a resolved run, so the dialog keeps its rows on screen
   * if the request itself was refused.
   */
  const generatePlans = useCallback(
    (
      input: { activityAllocations: ActivityQuota[]; replaceExisting: boolean },
      onDone?: () => void,
    ) => {
      if (!canGenerate) return
      generate.mutate(
        {
          periodMonth: month,
          activityAllocations: input.activityAllocations,
          replaceExisting: input.replaceExisting,
        },
        {
          onSuccess: (result) => {
            const count = (outcome: string) =>
              result.results.filter((r) => r.outcome === outcome).length
            const inProgress = count('skipped_in_progress')
            const noBeats = count('no_beats')
            const existing = count('skipped_existing')
            const written = result.created + count('replaced')

            const notes = [
              existing ? `${existing} already had one` : '',
              // Named apart from the rest: this is the skip `replaceExisting`
              // cannot override, and an admin who ticked that box needs to know why
              // some sales incharges still didn't move.
              inProgress
                ? `${inProgress} already past draft (the sales incharge's schedule was kept)`
                : '',
              noBeats ? `${noBeats} with no beats allocated` : '',
              result.failed ? `${result.failed} failed` : '',
            ].filter(Boolean)

            toastsuccessmsg(
              written
                ? `${written} draft${written === 1 ? '' : 's'} written${
                    notes.length ? ` — ${notes.join('; ')}` : ''
                  }. Publish each one to release it to the sales incharge.`
                : notes.length
                  ? `Nothing written — ${notes.join('; ')}.`
                  : 'Nothing written — every sales incharge already has a plan for this month.',
            )
            onDone?.()
          },
          onError: (error) => toastApiError(error, 'Failed to generate the plans.'),
        },
      )
    },
    [generate, month, canGenerate],
  )

  return {
    month,
    monthLabel: monthLabel(month),
    goPrevMonth: () => selectMonth(shiftMonth(month, -1)),
    goNextMonth: () => selectMonth(shiftMonth(month, 1)),
    selectMonth,
    rows: queue.data?.rows ?? [],
    /** Rows matching the current tab and search — the table's `rowCount`. */
    total: queue.data?.total ?? 0,
    isLoading: queue.isLoading,
    isFetching: queue.isFetching,
    error: queue.error,
    refetch,
    /** Last successful fetch, for the toolbar's "Fetched x ago". */
    updatedAt: queue.dataUpdatedAt,
    filters,
    patchFilters,
    resetFilters,
    hasActiveFilters: filters.search.trim() !== '' || filters.status !== null,
    pagination,
    setPagination,
    sorting,
    setSorting,
    generatePlans,
    isGenerating: generate.isPending,
    /** Activity master behind the generate dialog's activity column. */
    activities: activities.data ?? [],
    /** Permission gate for the header action. */
    canGenerate,
  }
}
