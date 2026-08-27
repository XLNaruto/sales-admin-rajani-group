/**
 * The `from_date`/`to_date` presets behind the field-request queues' date
 * filter — shared by Beat Changes ("Day being changed") and Day Changes ("Day
 * being re-planned"), which bound the same thing.
 *
 * The endpoint bounds the DAY BEING CHANGED rather than when the request was
 * raised, so the useful question is "what is being asked about next week" — a
 * pair of raw date boxes would make the admin compute that themselves. The
 * windows are string arithmetic on purpose: calendar dates are `yyyy-MM-dd` and
 * must not be round-tripped through a `Date` to read local parts back out.
 */
import { format } from 'date-fns'

/** Which stretch of the calendar the queue is being asked about. */
export type PlanDateWindow = 'all' | 'upcoming' | 'this-month' | 'next-month' | 'past'

/** Today as `yyyy-MM-dd`. */
function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Shift a `yyyy-MM-dd` date by ±n days. Both ends of the trip are UTC, so the day cannot slip. */
function shiftDate(date: string, delta: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + delta * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

/** First and last calendar date of the `yyyy-MM` month `date` falls in. */
function monthBounds(date: string, monthDelta = 0): { from: string; to: string } {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const total = year * 12 + (month - 1) + monthDelta
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  const mm = String(m).padStart(2, '0')
  // Day 0 of the NEXT month is the last day of this one.
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(days).padStart(2, '0')}` }
}

/**
 * The `{ fromDate, toDate }` a window resolves to — either side is `undefined`
 * when that end is unbounded, and `all` bounds neither.
 */
export function planDateBounds(window: PlanDateWindow): {
  fromDate?: string
  toDate?: string
} {
  const today = todayISO()
  switch (window) {
    case 'upcoming':
      return { fromDate: today }
    case 'this-month':
      return toParams(monthBounds(today))
    case 'next-month':
      return toParams(monthBounds(today, 1))
    case 'past':
      return { toDate: shiftDate(today, -1) }
    case 'all':
    default:
      return {}
  }
}

/** A `{ from, to }` month window as the endpoint's two bound params. */
function toParams({ from, to }: { from: string; to: string }) {
  return { fromDate: from, toDate: to }
}

/** Dropdown labels for the window presets, in the order they read best. */
export const PLAN_DATE_WINDOWS: { label: string; value: PlanDateWindow }[] = [
  { label: 'Any day', value: 'all' },
  { label: 'Today onwards', value: 'upcoming' },
  { label: 'This month', value: 'this-month' },
  { label: 'Next month', value: 'next-month' },
  { label: 'Past days', value: 'past' },
]
