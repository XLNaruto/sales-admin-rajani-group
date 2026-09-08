import { useState } from 'react'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from '@/components/data-table'
import { useBeats, useBeatsInfinite, useDeleteBeat } from '../api/use-beats'
import type { BeatFilters } from '../components/beat-toolbar'
import type { Beat, BeatGrade, BeatSortBy } from '../types'
import { toastApiError } from '@/lib/api-toast'

/** Empty filter state — also used to reset the toolbar. */
const INITIAL_FILTERS: BeatFilters = { search: '', grade: 'all' }

/** Map a table column id → the list endpoint's `sort_by` value. */
const SORT_BY_COLUMN: Record<string, BeatSortBy> = {
  beatName: 'name',
  beatGrade: 'grade',
}

/**
 * Orchestrates the beats list screen: filter/pagination/sort state, the live
 * (server-filtered) list query, the delete flow, and the add/edit modal state.
 * The page consumes this and only renders.
 */
export function useBeatsList() {
  const [filters, setFilters] = useState<BeatFilters>(INITIAL_FILTERS)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 })
  const [sorting, setSorting] = useState<SortingState>([])

  // Any filter/sort change resets to the first page.
  const patchFilters = (patch: Partial<BeatFilters>) => {
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

  const sort = sorting[0]
  const sortBy = sort ? SORT_BY_COLUMN[sort.id] : undefined

  // "All" selected → lazy/infinite mode; otherwise classic page-by-page.
  const isAll = pagination.pageSize === ALL_PAGE_SIZE

  // Shared server-side filter/sort params (page/size differ per mode).
  const baseParams = {
    search: filters.search.trim() || undefined,
    grade: filters.grade !== 'all' ? (filters.grade as BeatGrade) : undefined,
    sortBy,
    sortOrder: sortBy ? (sort.desc ? 'desc' : 'asc') : undefined,
  } as const

  // Only one of the two queries is enabled at a time (based on `isAll`).
  const { data, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } =
    useBeats(
    {
      ...baseParams,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    { enabled: !isAll },
  )

  const infinite = useBeatsInfinite(
    { ...baseParams, pageSize: INFINITE_BATCH_SIZE },
    { enabled: isAll },
  )

  const infiniteRows = infinite.data?.pages.flatMap((p) => p.items) ?? []
  const infiniteTotal = infinite.data?.pages.at(-1)?.total ?? infiniteRows.length

  const rows = isAll ? infiniteRows : (data?.items ?? [])
  const rowCount = isAll ? infiniteTotal : (data?.total ?? 0)
  const listIsLoading = isAll ? infinite.isLoading : isLoading
  const listIsError = isAll ? infinite.isError : isError
  // Surfaced so the page can render the Forbidden screen on a 403.
  const listError = isAll ? infinite.error : error

  // Manual refresh for the toolbar: refetch the active query (paged or
  // infinite) and surface when the rows on screen were last fetched, so a
  // background change made by someone else is one click away.
  const refresh = {
    onRefresh: () => {
      void (isAll ? infinite.refetch() : refetch())
    },
    updatedAt: isAll ? infinite.dataUpdatedAt : dataUpdatedAt,
    isFetching: isAll ? infinite.isFetching : isFetching,
  }
  const hasActiveFilters = filters.search !== '' || filters.grade !== 'all'

  // Add/edit modal — `editId === null` in create mode, an id string in edit mode.
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const openCreate = () => {
    setEditId(null)
    setModalOpen(true)
  }
  const openEdit = (id: string) => {
    setEditId(id)
    setModalOpen(true)
  }
  const closeModal = () => setModalOpen(false)

  // Delete flow — confirm in a dialog, then DELETE the selected row.
  const deleteBeat = useDeleteBeat()
  const [pendingDelete, setPendingDelete] = useState<Beat | null>(null)
  const confirmDelete = () => {
    if (!pendingDelete) return
    const target = pendingDelete
    deleteBeat.mutate(target.id, {
      onSuccess: () => {
        toast.success(`${target.beatName} removed`)
        setPendingDelete(null)
      },
      onError: (e) => toastApiError(e, "Couldn't remove the beat."),
    })
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
    isLoading: listIsLoading,
    isError: listIsError,
    error: listError,
    // Infinite ("All") scroll wiring — no-op unless the "All" page size is set.
    onLoadMore: isAll ? () => infinite.fetchNextPage() : undefined,
    hasMore: isAll ? infinite.hasNextPage : false,
    isFetchingMore: isAll ? infinite.isFetchingNextPage : false,
    hasActiveFilters,
    modalOpen,
    editId,
    openCreate,
    openEdit,
    closeModal,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteBeat.isPending,
  }
}
