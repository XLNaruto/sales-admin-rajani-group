import { useState } from 'react'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from '@/components/data-table'
import { useOnCompanySwitch } from '@/features/company'
import {
  useRetailerEditRequestList,
  useRetailerEditRequestsInfinite,
  useReviewRetailerEditRequest,
} from '../api/use-retailer-edit-requests'
import type { RetailerEditRequestFilters } from '../components/retailer-edit-request-toolbar'
import { classifyRetailerEditReviewError, rejectReasonError } from '../lib/review-error'
import type { RetailerEditRequest } from '../types'

/** Empty filter state — also what Reset returns to. The queue opens on `pending`. */
const INITIAL_FILTERS: RetailerEditRequestFilters = {
  search: '',
  status: 'pending',
  salesInchargeId: 'all',
  salesInchargeName: '',
}

/**
 * Orchestrates the retailer-edit queue: filter/pagination/sort state, the live
 * list query, the detail dialog, and the approve/reject flow. The page consumes
 * this and only renders.
 */
export function useRetailerEditRequestsList() {
  const [filters, setFilters] = useState<RetailerEditRequestFilters>(INITIAL_FILTERS)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([])

  const patchFilters = (patch: Partial<RetailerEditRequestFilters>) => {
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

  // The endpoint sorts only by request time — only that column's arrow counts.
  const sort = sorting.find((s) => s.id === 'createdAt')
  const isAll = pagination.pageSize === ALL_PAGE_SIZE

  const baseParams = {
    status: filters.status,
    search: filters.search.trim() || undefined,
    salesInchargeId:
      filters.salesInchargeId === 'all' ? undefined : Number(filters.salesInchargeId),
    sortOrder: sort ? ((sort.desc ? 'desc' : 'asc') as 'asc' | 'desc') : undefined,
  } as const

  const { data, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } =
    useRetailerEditRequestList(
      { ...baseParams, page: pagination.pageIndex + 1, pageSize: pagination.pageSize },
      { enabled: !isAll },
    )

  const infinite = useRetailerEditRequestsInfinite(
    { ...baseParams, pageSize: INFINITE_BATCH_SIZE },
    { enabled: isAll },
  )

  const infiniteRows = infinite.data?.pages.flatMap((p) => p.items) ?? []
  const infiniteTotal = infinite.data?.pages.at(-1)?.total ?? infiniteRows.length

  const rows = isAll ? infiniteRows : (data?.items ?? [])
  const rowCount = isAll ? infiniteTotal : (data?.total ?? 0)

  const refresh = {
    onRefresh: () => {
      void (isAll ? infinite.refetch() : refetch())
    },
    updatedAt: isAll ? infinite.dataUpdatedAt : dataUpdatedAt,
    isFetching: isAll ? infinite.isFetching : isFetching,
  }

  const hasActiveFilters =
    filters.search !== '' || filters.status !== 'pending' || filters.salesInchargeId !== 'all'

  // --- Detail + review -------------------------------------------------------
  const [detailRow, setDetailRow] = useState<RetailerEditRequest | null>(null)

  const review = useReviewRetailerEditRequest()
  const [pendingApprove, setPendingApprove] = useState<RetailerEditRequest | null>(null)
  const [pendingReject, setPendingReject] = useState<RetailerEditRequest | null>(null)
  /** Optional note on an approval; required reason on a rejection. */
  const [approveNote, setApproveNoteState] = useState('')
  const [rejectReason, setRejectReasonState] = useState('')
  // Server-side reason error (a 400), shown under the active box.
  const [reasonServerError, setReasonServerError] = useState<string | null>(null)

  const setApproveNote = (v: string) => {
    setApproveNoteState(v)
    setReasonServerError(null)
  }
  const setRejectReason = (v: string) => {
    setRejectReasonState(v)
    setReasonServerError(null)
  }

  // One dialog at a time: answering from the detail view closes it first.
  const openApprove = (row: RetailerEditRequest) => {
    setDetailRow(null)
    setApproveNote('')
    setPendingApprove(row)
  }
  const openReject = (row: RetailerEditRequest) => {
    setDetailRow(null)
    setRejectReason('')
    setPendingReject(row)
  }
  const closeApprove = () => {
    setPendingApprove(null)
    setApproveNote('')
  }
  const closeReject = () => {
    setPendingReject(null)
    setRejectReason('')
  }

  /** Shared failure path for both answers — see `classifyRetailerEditReviewError`. */
  const onReviewError = (e: unknown, target: RetailerEditRequest) => {
    const { kind, message } = classifyRetailerEditReviewError(e)
    switch (kind) {
      case 'already-answered':
      case 'gone':
        // The list is invalidated on settle, so the row refreshes itself.
        toast.error(message)
        closeApprove()
        closeReject()
        return
      case 'must-reject':
        // The only way out is a rejection — take the admin straight there.
        toast.error(message)
        closeApprove()
        openReject(target)
        return
      case 'reason-invalid':
        setReasonServerError(message)
        return
      default:
        toast.error(message)
    }
  }

  const confirmApprove = () => {
    if (!pendingApprove) return
    const target = pendingApprove
    review.mutate(
      { id: target.id, review: { status: 'approved', reason: approveNote } },
      {
        onSuccess: () => {
          toast.success('Edit approved — the outlet now has the requested details.')
          closeApprove()
        },
        onError: (e) => onReviewError(e, target),
      },
    )
  }

  const confirmReject = () => {
    if (!pendingReject || rejectReasonError(rejectReason)) return
    const target = pendingReject
    review.mutate(
      { id: target.id, review: { status: 'rejected', reason: rejectReason } },
      {
        onSuccess: () => {
          toast.success('Edit rejected — the rep can read your reason in the app.')
          closeReject()
        },
        onError: (e) => onReviewError(e, target),
      },
    )
  }

  // A company switch invalidates every row and option id on screen.
  useOnCompanySwitch(() => {
    setDetailRow(null)
    closeApprove()
    closeReject()
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
    error: isAll ? infinite.error : error,
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
    closeApprove,
    closeReject,
    approveNote,
    setApproveNote,
    rejectReason,
    setRejectReason,
    reasonServerError,
    confirmApprove,
    confirmReject,
    isReviewing: review.isPending,
  }
}
