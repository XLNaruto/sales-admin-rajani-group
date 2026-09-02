/**
 * State for the Live Fleet Map.
 *
 * The screen answers one question — "where is my whole team right now?" — so all
 * this hook owns is which day is being read, how the list is narrowed, and
 * whether the poll is running. The day lives in the URL's encrypted `?data=`
 * token so a refresh, a bookmark or a link shared with a manager all land on the
 * same day, and so the trail screen can be opened carrying it.
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { useOnCompanySwitch, useOpenCompanyPickerOnError } from '@/features/company'
import { useFleetLocations, FLEET_POLL_MS } from '../api/use-location-tracking'
import { fixState, shiftTracked, todayTracked, trackedDateLabel } from '../lib/location-format'
import type { FleetFilters } from '../components/fleet-toolbar'
import type { FleetSortBy, RepStatus } from '../types'

/** Empty filter state — also what the toolbar's Reset restores. */
const INITIAL_FILTERS: FleetFilters = {
  search: '',
  status: 'all',
  beatId: 'all',
  beatName: '',
  signal: 'all',
  device: 'all',
}

/** Map a table column id → the endpoint's `sort_by` value. */
const SORT_BY_COLUMN: Record<string, FleetSortBy> = {
  salesInchargeName: 'display_name',
  employeeCode: 'employee_code',
  status: 'status',
}

/** Params carried in the encrypted `?data=` token. */
interface FleetParamsToken {
  /** `yyyy-MM-dd` — the IST calendar day being read. */
  date?: string
  /**
   * Whether the poll is running. In the URL rather than in state because a
   * deliberate pause must survive a refresh: the whole point of pausing is to
   * hold the figures still, and a reload that silently resumed polling would
   * move them again.
   */
  live?: boolean
}

export function useFleetMap(data?: string) {
  const navigate = useNavigate()
  const token = useMemo<FleetParamsToken>(
    () => (data ? (decryptParams<FleetParamsToken>(data) ?? {}) : {}),
    [data],
  )

  // One clock read per mount, so "today" can't shift mid-session and disable the
  // stepper's Next arrow underneath the user.
  const today = useMemo(() => todayTracked(), [])
  const trackedDate = token.date ?? today

  // Absent means running: the screen arrives live, and only an explicit pause is
  // ever written into the token.
  const live = token.live !== false

  const [filters, setFilters] = useState<FleetFilters>(INITIAL_FILTERS)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [sorting, setSorting] = useState<SortingState>([])
  /** Which row the map has focused, so a list click pans the map. */
  const [focusedId, setFocusedId] = useState<string | null>(null)

  /**
   * Rewrite the `?data=` token, carrying everything not being changed. Always a
   * `replace`: neither the day nor the poll state is a place in history to go
   * back to, and a Back button that stepped through pauses would be nonsense.
   */
  const writeToken = useCallback(
    (patch: FleetParamsToken) => {
      navigate({
        to: '/tracking/live',
        search: { data: encryptParams({ date: trackedDate, live, ...patch }) },
        replace: true,
      })
    },
    [navigate, trackedDate, live],
  )

  // Any filter/sort change goes back to the first page — otherwise you can sit
  // on a page that no longer exists for the narrower result set.
  const patchFilters = useCallback((patch: Partial<FleetFilters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [])

  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const sort = sorting[0]
  const sortBy = sort ? SORT_BY_COLUMN[sort.id] : undefined

  const params = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    trackedDate,
    // The endpoint caps `search` at 200 characters and answers a longer one
    // with a 400 — clamped here rather than letting a paste fail the request.
    search: filters.search.trim().slice(0, 200) || undefined,
    status: filters.status !== 'all' ? (filters.status as RepStatus) : undefined,
    beatId: filters.beatId !== 'all' ? filters.beatId : undefined,
    // Only ever sent as `true`: "show me everything" is the param's absence, not
    // `only_stale=false`.
    onlyStale: filters.signal === 'stale' || undefined,
    onlyFake: filters.device === 'mock' || undefined,
    sortBy,
    sortOrder: sortBy ? ((sort.desc ? 'desc' : 'asc') as 'asc' | 'desc') : undefined,
  }

  const fleet = useFleetLocations(params, { pollMs: live ? FLEET_POLL_MS : false })

  // A 403 that means "no company selected" opens the picker instead of the
  // access-denied screen — the user holds the permission, the session lost its
  // tenant.
  useOpenCompanyPickerOnError(fleet.error)

  const rows = useMemo(() => fleet.data?.items ?? [], [fleet.data])

  /**
   * `beat_id`, `only_stale` and `only_fake` filter on the latest fix, which the
   * server applies AFTER paginating the rep list. While any of them is on, a
   * page can be short or empty with more pages still to come — so the screen
   * shows a plain "N matching on this page" count and never presents a filtered
   * total it cannot compute.
   */
  const narrowing =
    filters.beatId !== 'all' || filters.signal !== 'all' || filters.device !== 'all'

  /** Page-level tallies. Explicitly of this page, never of the team. */
  const pageCounts = useMemo(() => {
    let fresh = 0
    let stale = 0
    let noSignal = 0
    let mock = 0
    for (const row of rows) {
      const state = fixState(row)
      if (state === 'fresh') fresh += 1
      else if (state === 'stale') stale += 1
      else noSignal += 1
      // Day-level, not latest-fix: the tally answers "how many reps reported a
      // fake location today", which is the question the rail's label asks.
      if (row.hasFakeLocation) mock += 1
    }
    return { fresh, stale, noSignal, mock, shown: rows.length }
  }, [rows])

  /** Point the screen at another day, keeping everything else. */
  const selectDate = useCallback(
    (next: string) => {
      if (!next || next === trackedDate) return
      // The route doesn't change, so this component isn't remounted — page 3 of
      // yesterday would otherwise carry over onto today.
      setPagination((p) => ({ ...p, pageIndex: 0 }))
      setFocusedId(null)
      writeToken({ date: next })
    },
    [trackedDate, writeToken],
  )

  /** Start or stop the poll — written to the URL so a refresh keeps it. */
  const toggleLive = useCallback(() => writeToken({ live: !live }), [live, writeToken])

  /**
   * Open one rep's trail for the day currently on screen — the tracked date is
   * carried through rather than defaulting to today, so a click never silently
   * changes which day is being looked at.
   */
  const goToTrail = useCallback(
    (inchargeId: string) => {
      navigate({
        to: '/tracking/trail',
        search: { data: encryptParams({ id: inchargeId, date: trackedDate }) },
      })
    },
    [navigate, trackedDate],
  )

  // Every id on screen is tenant-scoped: drop the focused row and the filters
  // (the beat facet's ids belong to the old company) when the tenant changes.
  useOnCompanySwitch(() => {
    setFocusedId(null)
    resetFilters()
  })

  return {
    trackedDate,
    trackedDateLabel: trackedDateLabel(trackedDate),
    /** Latest selectable day — there are no fixes from the future. */
    today,
    selectDate,
    prevDate: () => selectDate(shiftTracked(trackedDate, -1)),
    nextDate: () => selectDate(shiftTracked(trackedDate, 1)),
    filters,
    patchFilters,
    resetFilters,
    hasActiveFilters:
      filters.search !== '' ||
      filters.status !== 'all' ||
      filters.beatId !== 'all' ||
      filters.signal !== 'all' ||
      filters.device !== 'all',
    narrowing,
    rows,
    /** REPS in the company on this day — not the number of markers on the map. */
    total: fleet.data?.total ?? 0,
    pageCounts,
    pagination,
    setPagination,
    sorting,
    onSortingChange,
    isLoading: fleet.isLoading,
    isError: fleet.isError,
    error: fleet.error,
    /** Poll state, exposed so the header can say whether the feed is running. */
    live,
    toggleLive,
    pollMs: FLEET_POLL_MS,
    /** Refresh button + "Fetched x ago" — the screen's last-refreshed stamp. */
    refresh: {
      onRefresh: () => void fleet.refetch(),
      updatedAt: fleet.dataUpdatedAt,
      isFetching: fleet.isFetching,
    },
    focusedId,
    setFocusedId,
    goToTrail,
  }
}
