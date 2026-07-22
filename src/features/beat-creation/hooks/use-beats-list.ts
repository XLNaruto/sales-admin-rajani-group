import { useState } from 'react'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { useBeats, useDeleteBeat } from '../api/use-beats'
import type { BeatFilters } from '../components/beat-toolbar'
import type { Beat, BeatGrade, BeatSortBy } from '../types'

/** Empty filter state — also used to reset the toolbar. */
const INITIAL_FILTERS: BeatFilters = { search: '', grade: 'all' }

/** Map a table column id → the list endpoint's `sort_by` value. */
const SORT_BY_COLUMN: Record<string, BeatSortBy> = {
  beatName: 'beat_name',
  beatGrade: 'beat_grade',
}

/**
 * Orchestrates the beats list screen: filter/pagination/sort state, the live
 * (server-filtered) list query, the delete flow, and the add/edit modal state.
 * The page consumes this and only renders.
 */
export function useBeatsList() {
  const [filters, setFilters] = useState<BeatFilters>(INITIAL_FILTERS)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
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

  const { data, isLoading, isError } = useBeats({
    search: filters.search.trim() || undefined,
    grade: filters.grade !== 'all' ? (filters.grade as BeatGrade) : undefined,
    sortBy,
    sortOrder: sortBy ? (sort.desc ? 'desc' : 'asc') : undefined,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  })

  const rows = data?.items ?? []
  const rowCount = data?.total ?? 0
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
      onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't remove the beat."),
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
    isLoading,
    isError,
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
