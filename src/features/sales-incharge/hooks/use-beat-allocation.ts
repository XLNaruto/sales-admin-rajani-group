import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { PaginationState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from '@/components/data-table'
import type { Beat } from '@/features/beat-creation'
import { useSalesInchargeDetail } from '../api/use-sales-incharge'
import {
  useAllocateBeat,
  useAllocatedBeats,
  useAllocatedBeatsInfinite,
  useAvailableBeats,
  useAvailableBeatsInfinite,
  useRemoveAllocatedBeat,
} from '../api/use-beat-allocation'

/** Per-list state: a debounce-free search box + its own server pagination. */
interface ListState {
  search: string
  pagination: PaginationState
}

const INITIAL_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 5 }

type PagedBeatQuery = ReturnType<typeof useAvailableBeats>
type InfiniteBeatQuery = ReturnType<typeof useAvailableBeatsInfinite>

/**
 * Collapse a list's paged + infinite queries into the single shape the panel
 * consumes. Exactly one of the two is enabled, so reading from whichever `isAll`
 * points at is safe. The infinite fields are inert outside "All" mode.
 */
function listView(
  isAll: boolean,
  paged: PagedBeatQuery,
  infinite: InfiniteBeatQuery,
) {
  const rows = isAll
    ? (infinite.data?.pages.flatMap((p) => p.items) ?? [])
    : (paged.data?.items ?? [])

  return {
    rows,
    rowCount: isAll
      ? (infinite.data?.pages.at(-1)?.total ?? rows.length)
      : (paged.data?.total ?? 0),
    isLoading: isAll ? infinite.isLoading : paged.isLoading,
    isError: isAll ? infinite.isError : paged.isError,
    // Surfaced so the page can render the Forbidden screen on a 403.
    error: isAll ? infinite.error : paged.error,
    onLoadMore: isAll ? () => infinite.fetchNextPage() : undefined,
    hasMore: isAll ? infinite.hasNextPage : false,
    isFetchingMore: isAll ? infinite.isFetchingNextPage : false,
  }
}

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

  // "All" selected → that list switches to its lazy/infinite query. Each list
  // decides independently, so only one of its two queries is ever enabled.
  const availableIsAll = available.pagination.pageSize === ALL_PAGE_SIZE
  const allocatedIsAll = allocated.pagination.pageSize === ALL_PAGE_SIZE

  const availableQuery = useAvailableBeats(
    inchargeId,
    {
      search: available.search.trim() || undefined,
      page: available.pagination.pageIndex + 1,
      pageSize: available.pagination.pageSize,
    },
    { enabled: !availableIsAll },
  )
  const availableInfinite = useAvailableBeatsInfinite(
    inchargeId,
    {
      search: available.search.trim() || undefined,
      pageSize: INFINITE_BATCH_SIZE,
    },
    { enabled: availableIsAll },
  )

  const allocatedQuery = useAllocatedBeats(
    inchargeId,
    {
      search: allocated.search.trim() || undefined,
      page: allocated.pagination.pageIndex + 1,
      pageSize: allocated.pagination.pageSize,
    },
    { enabled: !allocatedIsAll },
  )
  const allocatedInfinite = useAllocatedBeatsInfinite(
    inchargeId,
    {
      search: allocated.search.trim() || undefined,
      pageSize: INFINITE_BATCH_SIZE,
    },
    { enabled: allocatedIsAll },
  )

  const availableView = listView(availableIsAll, availableQuery, availableInfinite)
  const allocatedView = listView(allocatedIsAll, allocatedQuery, allocatedInfinite)

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
  const allocate = useAllocateBeat(inchargeId)
  const remove = useRemoveAllocatedBeat(inchargeId)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const addBeat = (beat: Beat) => {
    setPendingId(beat.id)
    allocate.mutate(beat.id, {
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
      ...availableView,
    },
    allocated: {
      search: allocated.search,
      setSearch: setAllocatedSearch,
      pagination: allocated.pagination,
      setPagination: setAllocatedPagination,
      ...allocatedView,
    },
    // Either beat list coming back forbidden means no access to allocation.
    listError: availableView.error ?? allocatedView.error,
    addBeat,
    removeBeat,
    pendingId,
    isMutating: allocate.isPending || remove.isPending,
  }
}
