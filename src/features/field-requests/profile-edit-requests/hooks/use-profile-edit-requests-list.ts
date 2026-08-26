import { useState } from 'react'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from '@/components/data-table'
import {
  useProfileEditRequestList,
  useProfileEditRequestsInfinite,
  useReviewProfileEditRequest,
} from '../api/use-profile-edit-requests'
import type { ProfileEditRequestFilters } from '../components/profile-edit-request-toolbar'
import type { ProfileEditRequest } from '../types'

/**
 * Empty filter state — also what Reset returns to. `pending` rather than blank:
 * the endpoint defaults to it, and a queue that opens on last month's answers
 * is a queue nobody trusts.
 */
const INITIAL_FILTERS: ProfileEditRequestFilters = {
  search: '',
  status: 'pending',
  salesInchargeId: 'all',
  salesInchargeName: '',
}

/**
 * Orchestrates the profile-edit queue: filter/pagination/sort state, the live
 * list query, the detail dialog, and the approve/reject flow. The page consumes
 * this and only renders.
 */
export function useProfileEditRequestsList() {
  const [filters, setFilters] = useState<ProfileEditRequestFilters>(INITIAL_FILTERS)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState<SortingState>([])

  // Any filter/sort change resets to the first page.
  const patchFilters = (patch: Partial<ProfileEditRequestFilters>) => {
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
    search: filters.search.trim() || undefined,
    salesInchargeId:
      filters.salesInchargeId === 'all' ? undefined : Number(filters.salesInchargeId),
    sortOrder: sort ? ((sort.desc ? 'desc' : 'asc') as 'asc' | 'desc') : undefined,
  } as const

  // Only one of the two queries is enabled at a time (based on `isAll`).
  const { data, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } =
    useProfileEditRequestList(
      {
        ...baseParams,
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      },
      { enabled: !isAll },
    )

  const infinite = useProfileEditRequestsInfinite(
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
    filters.search !== '' ||
    filters.status !== 'pending' ||
    filters.salesInchargeId !== 'all'

  // --- Detail + review flow -----------------------------------------------
  const [detailRow, setDetailRow] = useState<ProfileEditRequest | null>(null)

  const review = useReviewProfileEditRequest()
  const [pendingApprove, setPendingApprove] = useState<ProfileEditRequest | null>(null)
  const [pendingReject, setPendingReject] = useState<ProfileEditRequest | null>(null)
  // Optional on an approval ("done, corrected on the 3rd"), required on a
  // rejection — one box, two rules, enforced by the dialog that opens it.
  const [reviewNote, setReviewNote] = useState('')

  /**
   * Open a confirmation, closing the detail dialog behind it.
   *
   * One dialog at a time: answering from the detail view would otherwise stack
   * the confirm on top of it, leaving the request's own text half-covered by
   * the thing asking about it. From a table row there is no detail open, so the
   * close is a no-op and both entry points behave the same.
   */
  const openApprove = (row: ProfileEditRequest) => {
    setDetailRow(null)
    setReviewNote('')
    setPendingApprove(row)
  }
  const openReject = (row: ProfileEditRequest) => {
    setDetailRow(null)
    setReviewNote('')
    setPendingReject(row)
  }

  const closeApprove = () => {
    setPendingApprove(null)
    setReviewNote('')
  }
  const closeReject = () => {
    setPendingReject(null)
    setReviewNote('')
  }

  const confirmApprove = () => {
    if (!pendingApprove) return
    const target = pendingApprove
    const note = reviewNote.trim()
    review.mutate(
      { id: target.id, review: { status: 'approved', reason: note || undefined } },
      {
        onSuccess: () => {
          toast.success(
            'Request approved — now make the correction on the sales incharge record.',
          )
          closeApprove()
        },
        // A request answered by another admin in the meantime comes back `409`
        // with its own message — surfaced verbatim rather than replaced.
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Couldn't approve the request."),
      },
    )
  }

  const confirmReject = () => {
    if (!pendingReject || reviewNote.trim() === '') return
    const target = pendingReject
    review.mutate(
      { id: target.id, review: { status: 'rejected', reason: reviewNote } },
      {
        onSuccess: () => {
          toast.success('Request rejected — the rep can read your reason in the app.')
          closeReject()
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Couldn't reject the request."),
      },
    )
  }

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
    detailRow,
    setDetailRow,
    pendingApprove,
    pendingReject,
    openApprove,
    openReject,
    reviewNote,
    setReviewNote,
    closeApprove,
    closeReject,
    confirmApprove,
    confirmReject,
    isReviewing: review.isPending,
  }
}
