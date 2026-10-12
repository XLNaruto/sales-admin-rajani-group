/**
 * State for the Daily Reports list.
 *
 * Every filter — kind, date, status, search, page and page size — lives in the
 * URL's encrypted `?data=` token, so a refresh, a shared link or Back from a
 * rep's report all land on the same view. The only local state is the search
 * box's raw text, which is debounced into the token.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useOpenCompanyPickerOnError } from '@/features/company'
import { todayIST } from '@/features/daily-summary'
import { shiftTracked, trackedDateLabel } from '@/features/location-tracking'
import { useDailyReports } from '../api/use-daily-reports'
import {
  isDailyReportKind,
  isStatusFilter,
  STATUS_FILTER_OPTIONS,
  toHasReport,
} from '../lib/daily-report-format'
import type { DailyReportKind, DailyReportRow, DailyReportStatusFilter } from '../types'
import type { DailyReportDetailToken } from './use-daily-report-detail'

export const DAILY_REPORT_PAGE_SIZES = [20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

/** The endpoint caps `search` at 200 characters. */
const SEARCH_MAX = 200

/** Params carried in the encrypted `?data=` token. */
interface DailyReportsToken {
  kind?: DailyReportKind
  /** `yyyy-MM-dd`, IST. Absent means today. */
  date?: string
  status?: DailyReportStatusFilter
  search?: string
  page?: number
  pageSize?: number
}

export function useDailyReportsScreen(data?: string) {
  const navigate = useNavigate()
  const token = useMemo<DailyReportsToken>(
    () => (data ? (decryptParams<DailyReportsToken>(data) ?? {}) : {}),
    [data],
  )

  // One clock read per mount, so "today" can't shift mid-session.
  const today = useMemo(() => todayIST(), [])
  // A future date is a 400 — a hand-edited or stale token falls back to today.
  const date = token.date && token.date <= today ? token.date : today
  // Evening is the default: it covers the whole day.
  const kind: DailyReportKind = isDailyReportKind(token.kind) ? token.kind : 'evening'
  const status: DailyReportStatusFilter = isStatusFilter(token.status) ? token.status : 'all'
  const page = token.page && token.page >= 1 ? Math.floor(token.page) : 1
  const pageSize =
    token.pageSize && DAILY_REPORT_PAGE_SIZES.includes(token.pageSize)
      ? token.pageSize
      : DEFAULT_PAGE_SIZE

  /**
   * Rewrite the token, carrying everything not being changed. Any change other
   * than paging goes back to page 1 — the patch says so by naming `page`.
   * Always a `replace`: a filter tweak is not a place in history.
   */
  const writeToken = useCallback(
    (patch: DailyReportsToken) => {
      navigate({
        to: '/daily-reports',
        search: {
          data: encryptParams({
            kind,
            date,
            status: status === 'all' ? undefined : status,
            search: token.search,
            page,
            pageSize,
            ...patch,
          }),
        },
        replace: true,
      })
    },
    [navigate, kind, date, status, token.search, page, pageSize],
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

  const selectKind = useCallback(
    (value: string) => {
      if (!isDailyReportKind(value) || value === kind) return
      writeToken({ kind: value, page: 1 })
    },
    [kind, writeToken],
  )

  const selectStatus = useCallback(
    (value: string) => {
      const next = isStatusFilter(value) ? value : 'all'
      if (next === status) return
      writeToken({ status: next === 'all' ? undefined : next, page: 1 })
    },
    [status, writeToken],
  )

  /** Clears the search and status filter; kind and date are the view, not filters. */
  const resetFilters = useCallback(() => {
    setSearchInput('')
    if (status !== 'all' || token.search) {
      writeToken({ status: undefined, search: undefined, page: 1 })
    }
  }, [status, token.search, writeToken])

  /* -------------------------------- Paging -------------------------------- */
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
  const query = useDailyReports({
    kind,
    date,
    search: token.search,
    hasReport: toHasReport(status),
    page,
    pageSize,
  })

  // `403 COMPANY_NOT_SELECTED` opens the company picker rather than reading as
  // a permission denial.
  useOpenCompanyPickerOnError(query.error)

  /* ------------------------------- Drill-down ----------------------------- */
  /**
   * Open a rep's report. A push, not a replace, so the browser's Back returns
   * here; the in-page Back button carries this screen's token through the
   * detail's own. Name and code ride along so the header can name the rep even
   * when the report itself 404s.
   */
  const openReport = useCallback(
    (row: DailyReportRow) => {
      if (!row.report) return
      const detail: DailyReportDetailToken = {
        id: row.salesInchargeId,
        kind: row.kind,
        date: row.date,
        name: row.salesInchargeName,
        code: row.employeeCode ?? undefined,
        backData: data,
      }
      navigate({ to: '/daily-reports/detail', search: { data: encryptParams(detail) } })
    },
    [navigate, data],
  )

  return {
    kind,
    selectKind,
    date,
    dateLabel: trackedDateLabel(date),
    today,
    selectDate,
    prevDate: () => selectDate(shiftTracked(date, -1)),
    nextDate: () => selectDate(shiftTracked(date, 1)),
    status: {
      key: 'status',
      label: 'Status',
      value: status,
      onChange: selectStatus,
      options: STATUS_FILTER_OPTIONS,
      clearValue: 'all',
    },
    search: searchInput,
    setSearch: setSearchInput,
    resetFilters,
    rows: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refresh: {
      onRefresh: () => void query.refetch(),
      updatedAt: query.dataUpdatedAt,
      isFetching: query.isFetching,
    },
    pagination,
    onPaginationChange,
    openReport,
  }
}
