/**
 * State for the Live Map screen.
 *
 * A read-only window on one (incharge, month) pair, so all this hook owns is
 * *which* pair — kept in the URL's encrypted `?data=` token rather than local
 * state, so a refresh, a bookmark or a link shared with a manager all land on the
 * same month.
 *
 * The window is a calendar month because the endpoint caps a range at 31 days (a
 * longer one is silently clamped). The cards are paged client-side: the response
 * is the whole month, and a month is the unit the screen is about.
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { useSalesInchargeSelect } from '@/features/sales-incharge'
import { useLiveMonth } from '../api/use-live-day'
import {
  currentMonth,
  monthLabel,
  monthRange,
  shiftMonth,
  todayISO,
} from '../lib/journey-format'
import { daysInScope, scopeCounts } from '../lib/live-day-metrics'
import type { DayScope, LiveMonthTotals } from '../types'

/**
 * Day cards per page. Eight fills exactly two rows of the four-column grid the
 * widest breakpoint uses, so a page is a complete block there.
 */
export const DAYS_PER_PAGE = 8

/** Params carried in the encrypted `?data=` token. */
interface LiveMapParams {
  /** Sales incharge being watched. */
  id?: string
  /** `yyyy-MM`. */
  month?: string
}

const EMPTY_TOTALS: LiveMonthTotals = {
  days: 0,
  daysOnField: 0,
  offDays: 0,
  gpsFlaggedDays: 0,
  totalCalls: 0,
  productiveCalls: 0,
  productivityPercentage: 0,
  avgCallsPerDay: 0,
  distanceMetres: 0,
}

export function useLiveMap(data?: string) {
  const navigate = useNavigate()
  const params = useMemo<LiveMapParams>(
    () => (data ? (decryptParams<LiveMapParams>(data) ?? {}) : {}),
    [data],
  )
  const month = params.month ?? currentMonth()

  const [scope, setScope] = useState<DayScope>('all')
  /** Current page of day cards, 1-based. */
  const [page, setPage] = useState(1)

  const inchargeSelect = useSalesInchargeSelect()
  // With no one in the URL, watch whoever the dropdown loaded first — the screen
  // is useless empty, and this is the same person the picker will be showing.
  const inchargeId = params.id ?? inchargeSelect.firstValue

  // One clock read per mount, so the "today" marker can't shift mid-session.
  const today = useMemo(() => todayISO(), [])
  const range = useMemo(() => monthRange(month), [month])

  const live = useLiveMonth({
    inchargeId,
    fromDate: range.from,
    toDate: range.to,
  })

  const selected = useMemo(
    () => inchargeSelect.options.find((option) => option.value === inchargeId),
    [inchargeSelect.options, inchargeId],
  )

  /** Point the screen at another (incharge, month). */
  const open = useCallback(
    (id: string | undefined, nextMonth: string) => {
      // The route doesn't change, so this component isn't remounted — page 4 of
      // July would otherwise carry over onto August.
      setPage(1)
      navigate({
        to: '/journey/live-map',
        search: { data: encryptParams({ id, month: nextMonth }) },
        replace: true,
      })
    },
    [navigate],
  )

  const selectIncharge = useCallback(
    (id: string) => {
      if (!id || id === inchargeId) return
      open(id, month)
    },
    [inchargeId, month, open],
  )

  const selectMonth = useCallback(
    (next: string) => {
      if (!next || next === month) return
      open(inchargeId, next)
    },
    [inchargeId, month, open],
  )

  const totals = live.data?.totals ?? EMPTY_TOTALS
  const allDays = useMemo(() => live.data?.days ?? [], [live.data])
  const counts = useMemo(() => scopeCounts(totals), [totals])
  const days = useMemo(() => daysInScope(allDays, scope), [allDays, scope])

  const selectScope = useCallback((next: DayScope) => {
    setScope(next)
    setPage(1)
  }, [])

  // Clamped rather than corrected in an effect: a slice that shrinks under the
  // current page must render its last page immediately, not one empty frame
  // followed by a re-render.
  const pageCount = Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE))
  const currentPage = Math.min(page, pageCount)
  const pagedDays = useMemo(
    () => days.slice((currentPage - 1) * DAYS_PER_PAGE, currentPage * DAYS_PER_PAGE),
    [days, currentPage],
  )

  const goToPage = useCallback(
    (next: number) => setPage(Math.min(Math.max(1, next), pageCount)),
    [pageCount],
  )

  return {
    /** Sales incharge on screen — the day cards carry it into their trail links. */
    inchargeId,
    /** Combobox props for the header's incharge picker, plus its current value. */
    incharge: {
      ...inchargeSelect,
      value: inchargeId ?? '',
      onChange: selectIncharge,
    },
    /** Employee code and designation of the person on screen, from the picker's row. */
    // Null, not a dash — the header drops the chip entirely when there is nothing to show.
    inchargeCode: selected?.badge?.replace(/^#/, '') ?? null,
    inchargeHint: selected?.hint ?? null,
    month,
    monthLabel: monthLabel(month),
    prevMonth: () => selectMonth(shiftMonth(month, -1)),
    nextMonth: () => selectMonth(shiftMonth(month, 1)),
    selectMonth,
    /** Today as `yyyy-MM-dd` — drives the "today" marker on the day cards. */
    today,
    isLoading: live.isLoading,
    isFetching: live.isFetching,
    error: live.error,
    scope,
    setScope: selectScope,
    counts,
    /** The active scope's days, all of them — the pagination denominator. */
    days,
    /** The page of day cards actually rendered. */
    pagedDays,
    page: currentPage,
    pageCount,
    goToPage,
    /** 1-based index of the first and last card on the page, for the summary. */
    from: days.length === 0 ? 0 : (currentPage - 1) * DAYS_PER_PAGE + 1,
    to: Math.min(days.length, currentPage * DAYS_PER_PAGE),
    /** Server-computed roll-up over the whole range — never recomputed here. */
    totals,
  }
}
