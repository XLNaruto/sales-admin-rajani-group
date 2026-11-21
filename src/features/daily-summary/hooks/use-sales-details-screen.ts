/**
 * State for one rep's Sales Details.
 *
 * The rep and date ride in the encrypted `?data=` token, along with the list's
 * own token so Back restores the exact Daily Summary view. Stepping the date
 * rewrites the token in place.
 */
import { useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { errorCode, errorStatus } from '@/lib/api-error'
import { useOpenCompanyPickerOnError } from '@/features/company'
import { shiftTracked, trackedDateLabel } from '@/features/location-tracking'
import { useDailySummarySalesDetails } from '../api/use-daily-summary'
import { isSalesDetailsFilter, todayIST } from '../lib/daily-summary-format'
import type { SalesDetailsFilter } from '../types'

export const SALES_DETAILS_PAGE_SIZES = [20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

/** What the Sales Details `?data=` token carries. */
export type SalesDetailsToken = {
  id?: string
  /** `yyyy-MM-dd`, IST. */
  date?: string
  /** Rep name and code from the list row — shown while loading and on a 404. */
  name?: string
  code?: string
  type?: SalesDetailsFilter
  page?: number
  pageSize?: number
  /** The Daily Summary's own token, for the Back button. */
  backData?: string
}

export function useSalesDetailsScreen(data?: string) {
  const navigate = useNavigate()
  const token = useMemo<SalesDetailsToken>(
    () => (data ? (decryptParams<SalesDetailsToken>(data) ?? {}) : {}),
    [data],
  )

  const today = useMemo(() => todayIST(), [])
  const id = token.id ? String(token.id) : undefined
  // A future date is a 400 — a hand-edited or stale token falls back to today.
  const date = token.date && token.date <= today ? token.date : today

  const type: SalesDetailsFilter = isSalesDetailsFilter(token.type) ? token.type : 'all'
  const page = token.page && token.page >= 1 ? Math.floor(token.page) : 1
  const pageSize =
    token.pageSize && SALES_DETAILS_PAGE_SIZES.includes(token.pageSize)
      ? token.pageSize
      : DEFAULT_PAGE_SIZE

  const query = useDailySummarySalesDetails(
    id ? { salesInchargeId: id, date, type, page, pageSize } : null,
  )
  useOpenCompanyPickerOnError(query.error)

  /** Rewrite the token in place — paging and date steps aren't places in history. */
  const writeToken = useCallback(
    (patch: SalesDetailsToken) => {
      navigate({
        to: '/daily-summary/sales-details',
        search: { data: encryptParams({ ...token, date, type, page, pageSize, ...patch }) },
        replace: true,
      })
    },
    [navigate, token, date, type, page, pageSize],
  )

  const selectDate = useCallback(
    (next: string) => {
      if (!next || next === date || next > today) return
      writeToken({ date: next, page: 1 })
    },
    [writeToken, date, today],
  )

  /** A chip change goes back to page 1; the date stays. */
  const selectType = useCallback(
    (value: string) => {
      if (!isSalesDetailsFilter(value) || value === type) return
      writeToken({ type: value, page: 1 })
    },
    [writeToken, type],
  )

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

  // A rep outside the selected company is a state of its own, not an error.
  const repMissing =
    errorStatus(query.error) === 404 && errorCode(query.error) === 'SALES_INCHARGE_NOT_FOUND'

  const details = query.data

  return {
    id,
    date,
    dateLabel: trackedDateLabel(date),
    today,
    selectDate,
    prevDate: () => selectDate(shiftTracked(date, -1)),
    nextDate: () => selectDate(shiftTracked(date, 1)),
    // The response's name wins once loaded; the token's covers loading and 404s.
    name: details?.salesInchargeName ?? token.name,
    code: token.code,
    details,
    type,
    selectType,
    pagination,
    onPaginationChange,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: repMissing ? null : query.error,
    repMissing,
    refresh: {
      onRefresh: () => void query.refetch(),
      updatedAt: query.dataUpdatedAt,
      isFetching: query.isFetching,
    },
    back: {
      to: '/daily-summary' as const,
      search: token.backData ? { data: token.backData } : {},
    },
  }
}
