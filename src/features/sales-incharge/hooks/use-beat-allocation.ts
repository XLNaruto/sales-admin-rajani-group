import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { PaginationState } from '@tanstack/react-table'
import { toast } from 'sonner'
import type { Beat } from '@/features/beat-creation'
import { useSalesInchargeDetail } from '../api/use-sales-incharge'
import {
  useAllocateBeats,
  useAllocatedBeats,
  useAvailableBeats,
  useRemoveAllocatedBeat,
} from '../api/use-beat-allocation'

/** Per-list state: a debounce-free search box + its own server pagination. */
interface ListState {
  search: string
  pagination: PaginationState
}

const INITIAL_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 5 }

/**
 * Orchestrates the beat-allocation screen for one sales incharge: the detail
 * header, plus two independent server-paged/searchable beat lists (available →
 * Add, allocated → Remove) and the mutations that move beats between them. The
 * page consumes this and only renders.
 */
export function useBeatAllocation(inchargeId: string | undefined) {
  const navigate = useNavigate()

  // The read-only detail shown in the header.
  const detail = useSalesInchargeDetail(inchargeId)

  // Each list owns its own search + pagination (they page independently).
  const [available, setAvailable] = useState<ListState>({
    search: '',
    pagination: INITIAL_PAGINATION,
  })
  const [allocated, setAllocated] = useState<ListState>({
    search: '',
    pagination: INITIAL_PAGINATION,
  })

  const availableQuery = useAvailableBeats(inchargeId, {
    search: available.search.trim() || undefined,
    page: available.pagination.pageIndex + 1,
    pageSize: available.pagination.pageSize,
  })
  const allocatedQuery = useAllocatedBeats(inchargeId, {
    search: allocated.search.trim() || undefined,
    page: allocated.pagination.pageIndex + 1,
    pageSize: allocated.pagination.pageSize,
  })

  // A search change resets that list to its first page.
  const setAvailableSearch = (search: string) =>
    setAvailable((s) => ({ ...s, search, pagination: { ...s.pagination, pageIndex: 0 } }))
  const setAllocatedSearch = (search: string) =>
    setAllocated((s) => ({ ...s, search, pagination: { ...s.pagination, pageIndex: 0 } }))

  const setAvailablePagination = (pagination: PaginationState) =>
    setAvailable((s) => ({ ...s, pagination }))
  const setAllocatedPagination = (pagination: PaginationState) =>
    setAllocated((s) => ({ ...s, pagination }))

  // Add / remove — track the in-flight beat id so only its button spins.
  const allocate = useAllocateBeats(inchargeId)
  const remove = useRemoveAllocatedBeat(inchargeId)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const addBeat = (beat: Beat) => {
    setPendingId(beat.id)
    allocate.mutate([beat.id], {
      onSuccess: () => toast.success(`${beat.beatName} allocated`),
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Couldn't allocate the beat."),
      onSettled: () => setPendingId(null),
    })
  }

  const removeBeat = (beat: Beat) => {
    setPendingId(beat.id)
    remove.mutate(beat.id, {
      onSuccess: () => toast.success(`${beat.beatName} removed`),
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Couldn't remove the beat."),
      onSettled: () => setPendingId(null),
    })
  }

  return {
    goBack: () => navigate({ to: '/sales-incharge' }),
    detail: {
      data: detail.data,
      isLoading: detail.isLoading,
      isError: detail.isError,
    },
    available: {
      search: available.search,
      setSearch: setAvailableSearch,
      pagination: available.pagination,
      setPagination: setAvailablePagination,
      rows: availableQuery.data?.items ?? [],
      rowCount: availableQuery.data?.total ?? 0,
      isLoading: availableQuery.isLoading,
      isError: availableQuery.isError,
    },
    allocated: {
      search: allocated.search,
      setSearch: setAllocatedSearch,
      pagination: allocated.pagination,
      setPagination: setAllocatedPagination,
      rows: allocatedQuery.data?.items ?? [],
      rowCount: allocatedQuery.data?.total ?? 0,
      isLoading: allocatedQuery.isLoading,
      isError: allocatedQuery.isError,
    },
    addBeat,
    removeBeat,
    pendingId,
    isMutating: allocate.isPending || remove.isPending,
  }
}
