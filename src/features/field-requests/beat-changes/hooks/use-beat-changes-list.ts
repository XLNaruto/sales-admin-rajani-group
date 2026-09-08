import { useState } from 'react'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from '@/components/data-table'
import { useOnCompanySwitch } from '@/features/company'
import { useBeatChangeList, useBeatChangesInfinite, useReviewBeatChange } from '../api/use-beat-changes'
import type { BeatChangeFilters } from '../components/beat-change-toolbar'
import { planDateBounds } from '../../lib/plan-date-window'
import type { BeatChange } from '../types'
import { toastApiError } from '@/lib/api-toast'

/**
 * Empty filter state — also what Reset returns to. `pending` rather than blank:
 * the endpoint defaults to it, and a queue that opens on last month's answers
 * is a queue nobody trusts.
 */
/**
 * A `yyyy-MM-dd` plan date as `dd-MM-yyyy` for the toast. Parsed date-only, so
 * `parseISO` builds a local midnight — the day cannot slip.
 */
function toastDateLabel(date: string): string {
  try {
    return format(parseISO(date), 'dd-MM-yyyy')
  } catch {
    return date
  }
}

const INITIAL_FILTERS: BeatChangeFilters = {
  status: 'pending',
  salesInchargeId: 'all',
  salesInchargeName: '',
  window: 'all',
}

/**
 * Orchestrates the beat-change queue: filter/pagination/sort state, the live
 * list query, and the approve/reject flow. The page consumes this and only
 * renders.
 */
export function useBeatChangesList() {
  const [filters, setFilters] = useState<BeatChangeFilters>(INITIAL_FILTERS)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState<SortingState>([])

  // Any filter/sort change resets to the first page.
  const patchFilters = (patch: Partial<BeatChangeFilters>) => {
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
    salesInchargeId:
      filters.salesInchargeId === 'all' ? undefined : Number(filters.salesInchargeId),
    ...planDateBounds(filters.window),
    sortOrder: sort ? ((sort.desc ? 'desc' : 'asc') as 'asc' | 'desc') : undefined,
  } as const

  // Only one of the two queries is enabled at a time (based on `isAll`).
  const { data, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } =
    useBeatChangeList(
      {
        ...baseParams,
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      },
      { enabled: !isAll },
    )

  const infinite = useBeatChangesInfinite(
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
    filters.salesInchargeId !== 'all' ||
    filters.window !== 'all'

  // --- Review flow --------------------------------------------------------
  // Approve and reject are separate confirmations: only one of them takes a
  // reason, and only that one may be blocked on it being filled in.
  const review = useReviewBeatChange()
  const [pendingApprove, setPendingApprove] = useState<BeatChange | null>(null)
  const [pendingReject, setPendingReject] = useState<BeatChange | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const closeReject = () => {
    setPendingReject(null)
    setRejectReason('')
  }

  const confirmApprove = () => {
    if (!pendingApprove) return
    const target = pendingApprove
    review.mutate(
      { id: target.id, review: { status: 'approved' } },
      {
        onSuccess: () => {
          toast.success(
            `Beat change approved — ${target.toBeatName ?? 'the new beat'} now runs on ${toastDateLabel(target.planDate)}.`,
          )
          setPendingApprove(null)
        },
        // The API re-checks every precondition at review time, so a refusal here
        // ("the day has locked", "that beat is no longer allocated") is the real
        // answer and is surfaced verbatim rather than replaced with a generic one.
        onError: (e) =>
          toastApiError(e, "Couldn't approve the beat change."),
      },
    )
  }

  const confirmReject = () => {
    if (!pendingReject || rejectReason.trim() === '') return
    const target = pendingReject
    review.mutate(
      { id: target.id, review: { status: 'rejected', rejectionReason: rejectReason } },
      {
        onSuccess: () => {
          toast.success('Beat change rejected — the rep can read your reason in the app.')
          closeReject()
        },
        onError: (e) =>
          toastApiError(e, "Couldn't reject the beat change."),
      },
    )
  }


  // Switching the active company invalidates every row on screen: let go of any
  // record-pinned dialog target (its id belongs to the old tenant) and reset the
  // filters, whose option ids are tenant-scoped too.
  useOnCompanySwitch(() => {
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
