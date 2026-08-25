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
import { useCreateJourneyPlan, useJourneyPlanQueue } from '../api/use-journey-plans'
import { currentMonth, monthLabel, shiftMonth } from '../lib/journey-format'
import { SORT_COLUMNS } from '../lib/journey-metrics'
import type { JourneyPlanDetail, PlanStatus, QueueParams } from '../types'

/** Filters the toolbar owns. `status: null` is the "All" tab. */
export interface AllocationFilters {
  search: string
  status: PlanStatus | null
}

const EMPTY_FILTERS: AllocationFilters = { search: '', status: null }

const DEFAULT_PAGE_SIZE = 5

export function useAllocationList() {
  const { can } = useCan()
  // Reading the list and opening a month are separate grants: a reviewer may
  // hold `journey-plan:list` and neither write key. `journey-plan:create` used to
  // mean "run the solver over the team"; it now means "open one empty draft".
  const canCreate = can('journey-plan:create')

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

  const create = useCreateJourneyPlan()

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
   * Open one empty draft for one sales incharge and this month.
   *
   * There is no team-wide run any more: field time is allocated per distributor,
   * so the allocation is a judgement about commercial relationships rather than
   * something a solver can propose. The plan lands as a **draft**, invisible to
   * the sales incharge, with nothing on it — the buckets go on next, on the plan
   * screen.
   *
   * A sales incharge who already has a plan for the period is **refused**, not
   * silently skipped, so the toast can name the collision instead of leaving the
   * admin wondering why nothing happened.
   *
   * `onDone` fires only on success, so the dialog keeps the chosen name on screen
   * next to the error when the request is refused.
   */
  const createPlan = useCallback(
    (inchargeId: string, onDone?: (plan: JourneyPlanDetail) => void) => {
      if (!canCreate || !inchargeId) return
      create.mutate(
        { inchargeId, periodMonth: month },
        {
          onSuccess: (plan) => {
            toastsuccessmsg(
              `Draft created for ${plan.inchargeName}. Allocate his days, then publish to hand ${monthLabel(month)} over.`,
            )
            onDone?.(plan)
          },
          // The 409 names the plan that already exists — worth showing verbatim.
          onError: (error) => toastApiError(error, 'Failed to create the plan.'),
        },
      )
    },
    [create, month, canCreate],
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
    createPlan,
    isCreating: create.isPending,
    /** Permission gate for the header action. */
    canCreate,
  }
}
