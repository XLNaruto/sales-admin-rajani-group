/**
 * State for the Live Day (day trail) screen.
 *
 * Like the month screen, the only thing this owns is *which* (incharge, date) is
 * on screen, kept in the URL's encrypted `?data=` token so a refresh or a shared
 * link lands on the same day. The trail filter is deliberately local: it is a way
 * of looking, not a thing to link to.
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { useSalesInchargeSelect } from '@/features/sales-incharge'
import { useLiveDayDetail } from '../api/use-live-day'
import { monthOf, shiftDate, todayISO } from '../lib/journey-format'
import { missesInFilter, visitsInFilter, withPoint } from '../lib/live-day-metrics'
import type { TrailFilter } from '../types'

/** Params carried in the encrypted `?data=` token. */
interface LiveDayParams {
  /** Sales incharge being watched. */
  id?: string
  /** The day, as `yyyy-MM-dd`. */
  date?: string
  /**
   * The screen that opened this day, when it wasn't the month grid. Drives the
   * header's Back button and where a company switch lands.
   */
  from?: LiveDayOrigin
  /** The origin screen's own `?data=` token, so Back restores its exact view. */
  backData?: string
}

/** Screens other than the month grid that drill into a day. */
export type LiveDayOrigin = 'daily-summary'

/** Where Back goes for each origin. Whitelisted — never a path from the URL. */
const ORIGIN_ROUTES = {
  'daily-summary': { to: '/daily-summary', label: 'Daily Summary' },
} as const satisfies Record<LiveDayOrigin, { to: string; label: string }>

export function useLiveDay(data?: string) {
  const navigate = useNavigate()
  const params = useMemo<LiveDayParams>(
    () => (data ? (decryptParams<LiveDayParams>(data) ?? {}) : {}),
    [data],
  )

  // One clock read per mount, so "today" can't shift mid-session.
  const today = useMemo(() => todayISO(), [])
  const date = params.date ?? today

  const [filter, setFilter] = useState<TrailFilter>('all')

  const inchargeSelect = useSalesInchargeSelect()
  const inchargeId = params.id ?? inchargeSelect.firstValue

  const query = useLiveDayDetail({ inchargeId, date })
  const day = query.data

  const selected = useMemo(
    () => inchargeSelect.options.find((option) => option.value === inchargeId),
    [inchargeSelect.options, inchargeId],
  )

  const origin = params.from && params.from in ORIGIN_ROUTES ? params.from : undefined
  const backData = origin ? params.backData : undefined

  const open = useCallback(
    (id: string | undefined, nextDate: string) => {
      // A different day is a different trail — the filter would otherwise stick
      // on a kind the new day has none of, and read as an empty map.
      setFilter('all')
      navigate({
        to: '/journey/live-day',
        // The origin rides along, so stepping days never loses the way back.
        search: { data: encryptParams({ id, date: nextDate, from: origin, backData }) },
        replace: true,
      })
    },
    [navigate, origin, backData],
  )

  const selectIncharge = useCallback(
    (id: string) => {
      if (!id || id === inchargeId) return
      open(id, date)
    },
    [inchargeId, date, open],
  )

  const selectDate = useCallback(
    (next: string) => {
      if (!next || next === date) return
      open(inchargeId, next)
    },
    [inchargeId, date, open],
  )

  /** Calls the active filter keeps — the timeline's rows. */
  const visits = useMemo(() => (day ? visitsInFilter(day, filter) : []), [day, filter])
  /** Planned stops the filter keeps — map markers, not calls. */
  const misses = useMemo(() => (day ? missesInFilter(day, filter) : []), [day, filter])

  return {
    day,
    isLoading: query.isLoading,
    error: query.error,
    date,
    dateLabel: format(parseISO(date), 'd MMM · EEE'),
    /** Combobox props for the header's incharge picker, plus its current value. */
    incharge: {
      ...inchargeSelect,
      value: inchargeId ?? '',
      onChange: selectIncharge,
    },
    // Null, not a dash — the header drops the chip entirely when there is nothing to show.
    inchargeCode: selected?.badge?.replace(/^#/, '') ?? null,
    inchargeHint: selected?.hint ?? null,
    /** Day pager — steps a day or jumps to a `yyyy-MM-dd`. */
    prevDate: () => selectDate(shiftDate(date, -1)),
    nextDate: () => selectDate(shiftDate(date, 1)),
    selectDate,
    today,
    /** Never let the pager walk into days that haven't happened. */
    canGoNext: date < today,
    filter,
    setFilter,
    visits,
    /** Only calls with a GPS fix can be drawn — a telephonic call has none. */
    visitMarkers: useMemo(() => withPoint(visits), [visits]),
    missMarkers: useMemo(() => withPoint(misses), [misses]),
    /** Every planned stop that was missed, regardless of filter. */
    missed: day?.notVisited ?? [],
    /**
     * Back to the screen that opened this day (e.g. the Daily Summary with its
     * filters intact), or null when it was opened from the month grid.
     */
    back: origin
      ? { ...ORIGIN_ROUTES[origin], search: backData ? { data: backData } : {} }
      : null,
    /** Token that reopens the month grid on this day's month. */
    monthToken: encryptParams({ id: inchargeId, month: monthOf(date) }),
  }
}
