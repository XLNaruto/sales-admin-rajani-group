import { useState } from 'react'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from '@/components/data-table'
import { useOnCompanySwitch } from '@/features/company'
import { useDayChangeList, useDayChangesInfinite, useReviewDayChange } from '../api/use-day-changes'
import type { DayChangeFilters } from '../components/day-change-toolbar'
import { planDateBounds } from '../../lib/plan-date-window'
import type { DayChange } from '../types'

/**
 * Empty filter state — also what Reset returns to. `pending` rather than blank:
 * the endpoint defaults to it, and these requests are usually about TODAY, so a
 * first page led by last week's decisions is a queue nobody can work.
 */
const INITIAL_FILTERS: DayChangeFilters = {
  status: 'pending',
  operation: 'all',
  salesInchargeId: 'all',
  salesInchargeName: '',
  window: 'all',
}

/**
 * Orchestrates the day-change queue: filter/pagination/sort state, the live
 * list query, the detail dialog and the approve/reject flow. The page consumes
 * this and only renders.
 */
export function useDayChangesList() {
  const [filters, setFilters] = useState<DayChangeFilters>(INITIAL_FILTERS)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState<SortingState>([])

  // Any filter/sort change resets to the first page.
  const patchFilters = (patch: Partial<DayChangeFilters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }
  const resetFilters = () => {
    setFilters(INITIAL_FILTERS)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }
  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  // The endpoint takes a direction but no `sort_by` — the queue is always
  // ordered by when the request was raised, so only the arrow on that one
  // column means anything.
  const sort = sorting.find((s) => s.id === 'requestedAt')

  // "All" selected → lazy/infinite mode; otherwise classic page-by-page.
  const isAll = pagination.pageSize === ALL_PAGE_SIZE

  const baseParams = {
    status: filters.status,
    operation: filters.operation === 'all' ? undefined : filters.operation,
    salesInchargeId:
      filters.salesInchargeId === 'all' ? undefined : Number(filters.salesInchargeId),
    ...planDateBounds(filters.window),
    sortOrder: sort ? ((sort.desc ? 'desc' : 'asc') as 'asc' | 'desc') : undefined,
  } as const

  // Only one of the two queries is enabled at a time (based on `isAll`).
  const { data, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } =
    useDayChangeList(
      {
        ...baseParams,
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      },
      { enabled: !isAll },
    )

  const infinite = useDayChangesInfinite(
    { ...baseParams, pageSize: INFINITE_BATCH_SIZE },
    { enabled: isAll },
  )

  const infiniteRows = infinite.data?.pages.flatMap((p) => p.items) ?? []
  const infiniteTotal = infinite.data?.pages.at(-1)?.total ?? infiniteRows.length

  const rows = isAll ? infiniteRows : (data?.items ?? [])
  const rowCount = isAll ? infiniteTotal : (data?.total ?? 0)

  // Manual refresh for the toolbar: refetch the active query and surface when
  // the rows on screen were last fetched.
  const refresh = {
    onRefresh: () => {
      void (isAll ? infinite.refetch() : refetch())
    },
    updatedAt: isAll ? infinite.dataUpdatedAt : dataUpdatedAt,
    isFetching: isAll ? infinite.isFetching : isFetching,
  }

  const hasActiveFilters =
    filters.status !== 'pending' ||
    filters.operation !== 'all' ||
    filters.salesInchargeId !== 'all' ||
    filters.window !== 'all'

  // --- Review flow --------------------------------------------------------
  // Approve and reject are separate confirmations: only one of them takes a
  // reason, and only that one may be blocked on it being filled in.
  const review = useReviewDayChange()
  const [detail, setDetail] = useState<DayChange | null>(null)
  const [pendingApprove, setPendingApprove] = useState<DayChange | null>(null)
  const [pendingReject, setPendingReject] = useState<DayChange | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const closeReject = () => {
    setPendingReject(null)
    setRejectReason('')
  }

  const confirmApprove = () => {
    if (!pendingApprove) return
    review.mutate(
      { id: pendingApprove.id, review: { status: 'approved' } },
      {
        onSuccess: ({ applied }) => {
          // The API answers with what it actually wrote — reported back rather
          // than assumed, because entries already visited against are kept and
          // the count the admin saw proposed is not the count that landed.
          toast.success(
            applied
              ? `Day change approved — ${applied.entriesAdded} added, ${applied.entriesRemoved} removed, ${applied.entriesKept} kept.`
              : 'Day change approved.',
          )
          setPendingApprove(null)
          setDetail(null)
        },
        // Every precondition is re-checked at review time, so a refusal here
        // ("that beat is no longer allocated", "the date has gone") is the real
        // answer and is surfaced verbatim rather than replaced with a generic one.
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : "Couldn't approve the day change.",
          ),
      },
    )
  }

  const confirmReject = () => {
    if (!pendingReject || rejectReason.trim() === '') return
    review.mutate(
      { id: pendingReject.id, review: { status: 'rejected', rejectionReason: rejectReason } },
      {
        onSuccess: () => {
          toast.success(
            'Day change rejected — the day you allocated stands, and the rep reads your reason in the app.',
          )
          closeReject()
          setDetail(null)
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Couldn't reject the day change."),
      },
    )
  }


  // Switching the active company invalidates every row on screen: let go of any
  // record-pinned dialog target (its id belongs to the old tenant) and reset the
  // filters, whose option ids are tenant-scoped too.
  useOnCompanySwitch(() => {
    setDetail(null)
    setPendingApprove(null)
    setPendingReject(null)
    setRejectReason('')
    resetFilters()
  })

  return {
    filters,
    patchFilters,
    resetFilters,
    rows,
    rowCount,
    pagination,
    setPagination,
    sorting,
    onSortingChange,
    refresh,
    isLoading: isAll ? infinite.isLoading : isLoading,
    isError: isAll ? infinite.isError : isError,
    // Surfaced so the page can render the Forbidden screen on a 403.
    error: isAll ? infinite.error : error,
    // Infinite ("All") scroll wiring — no-op unless the "All" page size is set.
    onLoadMore: isAll ? () => infinite.fetchNextPage() : undefined,
    hasMore: isAll ? infinite.hasNextPage : false,
    isFetchingMore: isAll ? infinite.isFetchingNextPage : false,
    hasActiveFilters,
    detail,
    setDetail,
    pendingApprove,
    setPendingApprove,
    pendingReject,
    setPendingReject,
    rejectReason,
    setRejectReason,
    closeReject,
    confirmApprove,
    confirmReject,
    isReviewing: review.isPending,
  }
}
