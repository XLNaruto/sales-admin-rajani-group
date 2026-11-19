import { useState } from 'react'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from '@/components/data-table'
import { useOnCompanySwitch } from '@/features/company'
import {
  useDeleteSalesInchargeFace,
  useFaceRequestList,
  useFaceRequestsInfinite,
  useReviewFaceRequest,
} from '../api/use-face-requests'
import type { FaceRequestFilters } from '../components/face-request-toolbar'
import {
  classifyFaceDeleteError,
  classifyFaceReviewError,
  rejectReasonError,
} from '../lib/review-error'
import type { FaceRequest } from '../types'

/** Empty filter state — also what Reset returns to. The queue opens on `pending`. */
const INITIAL_FILTERS: FaceRequestFilters = {
  search: '',
  status: 'pending',
  type: 'all',
  salesInchargeId: 'all',
  salesInchargeName: '',
}

/**
 * Orchestrates the face-request queue: filter/pagination/sort state, the live
 * list query, the detail dialog, and the approve/reject flow. The page consumes
 * this and only renders.
 */
export function useFaceRequestsList() {
  const [filters, setFilters] = useState<FaceRequestFilters>(INITIAL_FILTERS)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState<SortingState>([])

  const patchFilters = (patch: Partial<FaceRequestFilters>) => {
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
    type: filters.type === 'all' ? undefined : filters.type,
    search: filters.search.trim() || undefined,
    salesInchargeId:
      filters.salesInchargeId === 'all' ? undefined : Number(filters.salesInchargeId),
    sortOrder: sort ? ((sort.desc ? 'desc' : 'asc') as 'asc' | 'desc') : undefined,
  } as const

  const { data, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } =
    useFaceRequestList(
      { ...baseParams, page: pagination.pageIndex + 1, pageSize: pagination.pageSize },
      { enabled: !isAll },
    )

  const infinite = useFaceRequestsInfinite(
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
    filters.search !== '' ||
    filters.status !== 'pending' ||
    filters.type !== 'all' ||
    filters.salesInchargeId !== 'all'

  // --- Detail + review flow -----------------------------------------------
  const [detailRow, setDetailRow] = useState<FaceRequest | null>(null)

  const review = useReviewFaceRequest()
  const [pendingApprove, setPendingApprove] = useState<FaceRequest | null>(null)
  const [pendingReject, setPendingReject] = useState<FaceRequest | null>(null)
  const [rejectReason, setRejectReasonState] = useState('')
  // Server-side reason error (a 400 VALIDATION_ERROR), shown under the box.
  const [rejectServerError, setRejectServerError] = useState<string | null>(null)

  const setRejectReason = (v: string) => {
    setRejectReasonState(v)
    setRejectServerError(null)
  }

  // One dialog at a time: answering from the detail view closes it first.
  const openApprove = (row: FaceRequest) => {
    setDetailRow(null)
    setPendingApprove(row)
  }
  const openReject = (row: FaceRequest) => {
    setDetailRow(null)
    setRejectReason('')
    setPendingReject(row)
  }
  const closeApprove = () => setPendingApprove(null)
  const closeReject = () => {
    setPendingReject(null)
    setRejectReason('')
  }

  /** Shared failure path for both answers — see `classifyFaceReviewError`. */
  const onReviewError = (e: unknown, target: FaceRequest) => {
    const { kind, message } = classifyFaceReviewError(e)
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
        setRejectServerError(message)
        return
      default:
        toast.error(message)
    }
  }

  const confirmApprove = () => {
    if (!pendingApprove) return
    const target = pendingApprove
    review.mutate(
      { id: target.id, review: { status: 'approved' } },
      {
        onSuccess: () => {
          toast.success(
            target.type === 'add'
              ? 'Face approved — it is now registered for attendance.'
              : 'Face approved — the new capture is now live for attendance.',
          )
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
      { id: target.id, review: { status: 'rejected', rejectReason } },
      {
        onSuccess: () => {
          toast.success('Face request rejected — the rep can read your reason in the app.')
          closeReject()
        },
        onError: (e) => onReviewError(e, target),
      },
    )
  }

  // --- Delete the rep's live face -------------------------------------------
  const deleteFace = useDeleteSalesInchargeFace()
  const [pendingDeleteFace, setPendingDeleteFace] = useState<FaceRequest | null>(null)

  const openDeleteFace = (row: FaceRequest) => setPendingDeleteFace(row)
  const closeDeleteFace = () => setPendingDeleteFace(null)

  const confirmDeleteFace = () => {
    if (!pendingDeleteFace) return
    const target = pendingDeleteFace
    deleteFace.mutate(target.salesInchargeId, {
      onSuccess: () => {
        toast.success(
          `Face deleted — ${target.salesInchargeName ?? 'the rep'} can now register a new one.`,
        )
        closeDeleteFace()
        setDetailRow(null)
      },
      onError: (e) => {
        const { kind, message } = classifyFaceDeleteError(e)
        toast.error(message)
        // Pending / gone won't change on a retry; the dialog re-reads on settle.
        if (kind !== 'other') closeDeleteFace()
      },
    })
  }

  // A company switch invalidates every row and option id on screen.
  useOnCompanySwitch(() => {
    setDetailRow(null)
    setPendingApprove(null)
    setPendingReject(null)
    setPendingDeleteFace(null)
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
    rejectReason,
    setRejectReason,
    rejectServerError,
    confirmApprove,
    confirmReject,
    isReviewing: review.isPending,
    pendingDeleteFace,
    openDeleteFace,
    closeDeleteFace,
    confirmDeleteFace,
    isDeletingFace: deleteFace.isPending,
  }
}
