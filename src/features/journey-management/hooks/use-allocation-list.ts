/**
 * State for the Allocations screen — one row per rep for a month.
 *
 * Everything the toolbar owns — the month, the search, the page and the sort — is
 * a query param, so each change is one refetch rather than a client-side pass
 * over the page.
 *
 * **One request, not two.** The old screen also fetched `/journey-plans/summary`
 * for its stat cards and tab badges; that endpoint is gone, because every count it
 * returned was by approval status and an allocation has none. The header's figure
 * is the list's own `total`.
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
import type { PinnedDay, QueueParams } from '../types'

/** Filters the toolbar owns. */
export interface AllocationFilters {
  search: string
}

const EMPTY_FILTERS: AllocationFilters = { search: '' }

const DEFAULT_PAGE_SIZE = 10

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
      search: search.trim() || undefined,
      ...(sort && SORT_COLUMNS[sort.id]
        ? {
            sortBy: SORT_COLUMNS[sort.id],
            sortOrder: sort.desc ? ('desc' as const) : ('asc' as const),
          }
        : {}),
    }
  }, [month, pagination, search, sorting])

  const queue = useJourneyPlanQueue(params)

  /**
   * The activity master, for the generate dialog's second column. Not fetched
   * without the grant to generate — nothing else on this screen reads it.
   */
  const activities = useActivities({ enabled: canGenerate && can('activity:list') })

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
   * Generate the month.
   *
   * Idempotent per rep and period: a rep who already has an allocation is skipped
   * unless `replaceExisting` is set.
   *
   * **A non-zero `failed` is not a failed run** — the endpoint answers 201 either
   * way. With no per-rep receipt on screen, the toast is the only report there is,
   * so it carries every outcome that isn't a plain success: skipped, no-beats and
   * failed all get said rather than folded into the total.
   *
   * `onDone` fires only on a resolved run, so the dialog keeps its pinned rows on
   * screen if the request itself was refused.
   */
  const generatePlans = useCallback(
    (
      input: { pinnedDays: PinnedDay[]; replaceExisting: boolean },
      onDone?: () => void,
    ) => {
      if (!canGenerate) return
      generate.mutate(
        {
          periodMonth: month,
          pinnedDays: input.pinnedDays,
          replaceExisting: input.replaceExisting,
        },
        {
          onSuccess: (result) => {
            const noBeats = result.results.filter((r) => r.outcome === 'no_beats').length
            const replaced = result.results.filter((r) => r.outcome === 'replaced').length
            const written = result.created + replaced
            // `no_beats` is counted inside `skipped` by the server, so naming both
            // would double-report it — it is qualified in brackets instead.
            const notes = [
              result.skipped
                ? `${result.skipped} already had one${
                    noBeats ? `, ${noBeats} with no beats allocated` : ''
                  }`
                : noBeats
                  ? `${noBeats} with no beats allocated`
                  : '',
              result.failed ? `${result.failed} failed` : '',
            ].filter(Boolean)

            toastsuccessmsg(
              written
                ? `${written} allocation${written === 1 ? '' : 's'} written${
                    notes.length ? ` — ${notes.join('; ')}` : ''
                  }.`
                : notes.length
                  ? `Nothing written — ${notes.join('; ')}.`
                  : 'Nothing written — every sales incharge already has an allocation for this month.',
            )
            onDone?.()
          },
          onError: (error) => toastApiError(error, 'Failed to generate the allocations.'),
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
    /** Rows matching the current search — the table's `rowCount`. */
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
    hasActiveFilters: filters.search.trim() !== '',
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
