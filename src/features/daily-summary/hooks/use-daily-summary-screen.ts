/**
 * State for the Daily Summary screen.
 *
 * Every filter — date, region, tab, search, page, page size and sort — lives in
 * the URL's encrypted `?data=` token, so a refresh, a shared link or Back from a
 * Live Day drill-down all land on the same view. The only local state is the
 * search box's raw text, which is debounced into the token.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useOpenCompanyPickerOnError } from '@/features/company'
import { useCan } from '@/features/permissions'
import { useStateSelect } from '@/features/location'
import { shiftTracked, trackedDateLabel } from '@/features/location-tracking'
import { useDailySummaries } from '../api/use-daily-summary'
import { isDailySummaryTab, todayIST } from '../lib/daily-summary-format'
import { LIVE_DAY_PERMISSION } from '../lib/permission'
import type {
  DailySummary,
  DailySummarySortBy,
  DailySummaryTab,
  SortOrder,
} from '../types'

export const DAILY_SUMMARY_PAGE_SIZES = [20, 50, 100]
const DEFAULT_PAGE_SIZE = 50

/** The endpoint caps `search` at 200 characters. */
const SEARCH_MAX = 200

const SORT_COLUMNS: DailySummarySortBy[] = [
  'sales_incharge_name',
  'employee_code',
  'log_in_at',
  'first_call_at',
  'tc',
  'pc',
  'productivity_percentage',
  'net_value',
]

/** Params carried in the encrypted `?data=` token. */
interface DailySummaryToken {
  /** `yyyy-MM-dd`, IST. Absent means today. */
  date?: string
  stateId?: string
  /** Rides along with the id so the Region trigger can name it before its page loads. */
  stateName?: string
  type?: DailySummaryTab
  search?: string
  page?: number
  pageSize?: number
  sortBy?: DailySummarySortBy
  sortOrder?: SortOrder
}

export function useDailySummaryScreen(data?: string) {
  const navigate = useNavigate()
  const token = useMemo<DailySummaryToken>(
    () => (data ? (decryptParams<DailySummaryToken>(data) ?? {}) : {}),
    [data],
  )

  // One clock read per mount, so "today" can't shift mid-session.
  const today = useMemo(() => todayIST(), [])
  // A future date is a 400 — a hand-edited or stale token falls back to today.
  const date = token.date && token.date <= today ? token.date : today
  const tab = isDailySummaryTab(token.type) ? token.type : undefined
  const page = token.page && token.page >= 1 ? Math.floor(token.page) : 1
  const pageSize =
    token.pageSize && DAILY_SUMMARY_PAGE_SIZES.includes(token.pageSize)
      ? token.pageSize
      : DEFAULT_PAGE_SIZE
  const sortBy = token.sortBy && SORT_COLUMNS.includes(token.sortBy) ? token.sortBy : undefined
  const sortOrder: SortOrder = token.sortOrder === 'asc' ? 'asc' : 'desc'

  /**
   * Rewrite the token, carrying everything not being changed. Any change other
   * than paging goes back to page 1 — the patch says so by naming `page`.
   * Always a `replace`: a filter tweak is not a place in history.
   */
  const writeToken = useCallback(
    (patch: DailySummaryToken) => {
      navigate({
        to: '/daily-summary',
        search: {
          data: encryptParams({
            date,
            stateId: token.stateId,
            stateName: token.stateName,
            type: tab,
            search: token.search,
            page,
            pageSize,
            sortBy,
            sortOrder: sortBy ? sortOrder : undefined,
            ...patch,
          }),
        },
        replace: true,
      })
    },
    [navigate, date, token.stateId, token.stateName, tab, token.search, page, pageSize, sortBy, sortOrder],
  )

  /* ------------------------------ Search box ------------------------------ */
  const [searchInput, setSearchInput] = useState(token.search ?? '')
  const debouncedSearch = useDebouncedValue(searchInput)
  const writeRef = useRef(writeToken)
  writeRef.current = writeToken
  const tokenSearchRef = useRef(token.search ?? '')
  tokenSearchRef.current = token.search ?? ''

  useEffect(() => {
    const next = debouncedSearch.trim().slice(0, SEARCH_MAX)
    if (next === tokenSearchRef.current) return
    writeRef.current({ search: next || undefined, page: 1 })
  }, [debouncedSearch])

  /* -------------------------------- Filters ------------------------------- */
  const selectDate = useCallback(
    (next: string) => {
      if (!next || next === date || next > today) return
      writeToken({ date: next, page: 1 })
    },
    [date, today, writeToken],
  )

  const selectTab = useCallback(
    (value: string) => {
      const next = isDailySummaryTab(value) ? value : undefined
      if (next === tab) return
      writeToken({ type: next, page: 1 })
    },
    [tab, writeToken],
  )

  const stateSelect = useStateSelect()
  const selectState = useCallback(
    (value: string) => {
      const id = value && value !== 'all' ? value : undefined
      if (id === token.stateId) return
      writeToken({
        stateId: id,
        stateName: id
          ? stateSelect.options.find((option) => option.value === id)?.label
          : undefined,
        page: 1,
      })
    },
    [token.stateId, stateSelect.options, writeToken],
  )

  /* --------------------------- Sorting & paging --------------------------- */
  const sorting = useMemo<SortingState>(
    () => (sortBy ? [{ id: sortBy, desc: sortOrder === 'desc' }] : []),
    [sortBy, sortOrder],
  )

  /**
   * The same column flips desc ↔ asc; a different column starts at desc. The
   * table's own cycle (asc → desc → off) is ignored — only *which* column was
   * clicked is read from it.
   */
  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    const clicked = (next[0]?.id ?? sorting[0]?.id) as DailySummarySortBy | undefined
    if (!clicked || !SORT_COLUMNS.includes(clicked)) return
    const current = sorting[0]
    const desc = current && current.id === clicked ? !current.desc : true
    writeToken({ sortBy: clicked, sortOrder: desc ? 'desc' : 'asc', page: 1 })
  }

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize],
  )

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater
    if (next.pageSize !== pageSize) {
      writeToken({ pageSize: next.pageSize, page: 1 })
    } else if (next.pageIndex !== pagination.pageIndex) {
      writeToken({ page: next.pageIndex + 1 })
    }
  }

  /* --------------------------------- Query -------------------------------- */
  const query = useDailySummaries({
    date,
    stateId: token.stateId,
    type: tab,
    search: token.search,
    page,
    pageSize,
    sortBy,
    sortOrder: sortBy ? sortOrder : undefined,
  })

  // `403 COMPANY_NOT_SELECTED` opens the company picker rather than reading as
  // a permission denial.
  useOpenCompanyPickerOnError(query.error)

  /* ------------------------------- Drill-down ----------------------------- */
  const { can } = useCan()
  const canOpenDay = can(LIVE_DAY_PERMISSION)

  /**
   * Open the rep's day on the Live Map's day trail. A push, not a replace, so
   * the browser's Back returns here too; the in-page Back button carries this
   * screen's token through the day's own token.
   */
  const openDay = useCallback(
    (row: DailySummary) => {
      if (!canOpenDay) return
      navigate({
        to: '/journey/live-day',
        search: {
          data: encryptParams({
            id: row.salesInchargeId,
            date: row.date,
            // Lets the day screen's Back button restore this exact view.
            from: 'daily-summary',
            backData: data,
          }),
        },
      })
    },
    [canOpenDay, navigate, data],
  )

  return {
    date,
    dateLabel: trackedDateLabel(date),
    today,
    selectDate,
    prevDate: () => selectDate(shiftTracked(date, -1)),
    nextDate: () => selectDate(shiftTracked(date, 1)),
    tab: tab ?? 'all',
    selectTab,
    region: {
      ...stateSelect,
      options: [{ label: 'All', value: 'all' }, ...stateSelect.options],
      value: token.stateId ?? 'all',
      fallbackLabel: token.stateName,
      onChange: selectState,
    },
    search: searchInput,
    setSearch: setSearchInput,
    clearSearch: () => setSearchInput(''),
    rows: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refresh: {
      onRefresh: () => void query.refetch(),
      updatedAt: query.dataUpdatedAt,
      isFetching: query.isFetching,
    },
    sorting,
    onSortingChange,
    pagination,
    onPaginationChange,
    canOpenDay,
    openDay,
  }
}
