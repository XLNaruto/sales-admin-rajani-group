import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { PaginationState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from '@/components/data-table'
import { encryptParams } from '@/lib/crypto'
import type { Beat } from '@/features/beat-creation'
import { useSalesInchargeDetail } from '../api/use-sales-incharge'
import { useSalesInchargeSelect } from './use-sales-incharge-select'
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
    // Manual refresh for the panel header — beats can be allocated elsewhere
    // while this screen sits open on cached rows.
    refresh: {
      onRefresh: () => {
        void (isAll ? infinite.refetch() : paged.refetch())
      },
      updatedAt: isAll ? infinite.dataUpdatedAt : paged.dataUpdatedAt,
      isFetching: isAll ? infinite.isFetching : paged.isFetching,
    },
  }
}

/**
 * Orchestrates the beat-allocation screen for one sales incharge: the incharge
 * picker, the detail header, plus two independent server-paged/searchable beat
 * lists (available → Add, allocated → Remove) and the mutations that move beats
 * between them. The page consumes this and only renders.
 *
 * `urlInchargeId` is the id decrypted from `?data=` when the screen is deep-
 * linked from the list. Opened straight from the sidebar there is none, so the
 * first incharge in the dropdown is preselected.
 */
export function useBeatAllocation(urlInchargeId: string | undefined) {
  const navigate = useNavigate()

  // Which incharge the whole screen is about — driven by the picker below.
  const inchargeSelect = useSalesInchargeSelect()
  const [selectedId, setSelectedId] = useState(urlInchargeId ?? '')

  // A deep link always wins; otherwise fall back to the first loaded option.
  // Once something is selected neither effect fires again.
  useEffect(() => {
    if (urlInchargeId) setSelectedId(urlInchargeId)
  }, [urlInchargeId])
  useEffect(() => {
    if (!selectedId && inchargeSelect.firstValue) {
      setSelectedId(inchargeSelect.firstValue)
    }
  }, [selectedId, inchargeSelect.firstValue])

  const inchargeId = selectedId || undefined

  // The read-only detail shown in the header.
  const detail = useSalesInchargeDetail(inchargeId)

  // A deep-linked incharge won't necessarily be on the dropdown's current page,
  // and the picker doubles as the header's name — so make sure the selected one
  // is always in the option list, otherwise the trigger falls back to its
  // placeholder and the name disappears.
  const inchargeOptions = useMemo(() => {
    const options = inchargeSelect.options
    const selected = detail.data
    if (!selected || options.some((o) => o.value === String(selected.id))) {
      return options
    }
    return [
      {
        value: String(selected.id),
        label: selected.displayName,
        badge: selected.employeeCode ? `#${selected.employeeCode}` : undefined,
        hint: selected.designation ?? undefined,
        avatarUrl: selected.profilePhotoUrl,
      },
      ...options,
    ]
  }, [inchargeSelect.options, detail.data])

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

  // Removing is destructive, so it goes through a confirmation dialog: the
  // table's Remove button only stages the beat, the dialog does the mutation.
  const [pendingRemove, setPendingRemove] = useState<Beat | null>(null)

  const confirmRemoveBeat = () => {
    if (!pendingRemove) return
    const beat = pendingRemove
    setPendingId(beat.id)
    remove.mutate(beat.id, {
      onSuccess: () => {
        toast.success(`${beat.beatName} removed`)
        setPendingRemove(null)
      },
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Couldn't remove the beat."),
      onSettled: () => setPendingId(null),
    })
  }

  // Switching incharge resets both lists (their rows no longer apply) and keeps
  // the URL's encrypted token in sync so a refresh lands on the same person.
  const selectIncharge = (id: string) => {
    if (!id || id === selectedId) return
    setSelectedId(id)
    setAvailable({ search: '', pagination: INITIAL_PAGINATION })
    setAllocated({ search: '', pagination: INITIAL_PAGINATION })
    navigate({
      to: '/sales-incharge/beat-allocation',
      search: { data: encryptParams({ id: Number(id) }) },
      replace: true,
    })
  }

  return {
    goBack: () => navigate({ to: '/sales-incharge' }),
    /** Combobox props for the incharge picker, plus its current value. */
    incharge: {
      ...inchargeSelect,
      options: inchargeOptions,
      value: selectedId,
      onChange: selectIncharge,
    },
    /** False until an incharge is picked — the panels have nothing to show yet. */
    hasSelection: Boolean(inchargeId),
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
    /** Stages a beat for removal — the confirm dialog performs it. */
    removeBeat: setPendingRemove,
    pendingRemove,
    setPendingRemove,
    confirmRemoveBeat,
    isRemoving: remove.isPending,
    pendingId,
    isMutating: allocate.isPending || remove.isPending,
  }
}
