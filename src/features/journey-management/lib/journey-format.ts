/**
 * Date, time and unit helpers shared by the journey screens.
 *
 * Pure string arithmetic on purpose. Calendar dates arrive as `YYYY-MM-DD` and
 * **must not** be round-tripped through a `Date` to read local parts back out —
 * the app is IST-only and that trip shifts the day. Only true timestamps
 * (ISO-8601 UTC) are parsed, and only to render a clock time.
 */
import { format, parseISO } from 'date-fns'

/** Day of month (1-based) from a `yyyy-MM-dd` string. */
export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10))
}

/** The `yyyy-MM` a `yyyy-MM-dd` (or `yyyy-MM…`) string belongs to. */
export function monthOf(date: string): string {
  return date.slice(0, 7)
}

/** Current month as `yyyy-MM`. */
export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

/** Today as `yyyy-MM-dd`. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Shift a `yyyy-MM` month by ±n months. */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number)
  const total = year * 12 + (m - 1) + delta
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** Shift a `yyyy-MM-dd` date by ±n days, without leaving string space wrongly. */
export function shiftDate(date: string, delta: number): string {
  // A UTC-anchored Date is safe here: both ends of the trip are UTC, so no
  // local-timezone shift can creep in.
  const ms = Date.parse(`${date}T00:00:00Z`) + delta * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

/** First and last calendar date of a `yyyy-MM` month, as `yyyy-MM-dd`. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number)
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(days).padStart(2, '0')}` }
}

/**
 * Every calendar date of a `yyyy-MM` month, in order, as `yyyy-MM-dd`.
 *
 * String arithmetic off the month's length — the dates never become `Date`s, so
 * no timezone trip can shift the first or last day out of the month.
 */
export function monthDates(month: string): string[] {
  const [year, m] = month.split('-').map(Number)
  if (!year || !m) return []
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate()
  return Array.from(
    { length: days },
    (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`,
  )
}

/** A `yyyy-MM-dd` date as "Mon, 04 Aug" — the label a date dropdown reads by. */
export function dayLabel(date: string): string {
  try {
    // Parsed date-only, so `parseISO` builds a local midnight — no UTC shift.
    return format(parseISO(date), 'EEE, dd MMM')
  } catch {
    return date
  }
}

/** A `yyyy-MM` month as "July 2026". */
export function monthLabel(month: string): string {
  try {
    return format(parseISO(`${month}-01`), 'MMMM yyyy')
  } catch {
    return month
  }
}

/** An ISO-8601 timestamp as a clock time (`04:15`), or null. */
export function timeOfDay(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return format(parseISO(iso), 'HH:mm')
  } catch {
    return null
  }
}

/** An ISO-8601 timestamp as "25 Jun, 03:10" (falls back to the raw value). */
export function stampLabel(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'd MMM, HH:mm')
  } catch {
    return iso
  }
}

/** Seconds as `7h 40m` — used for the two attendance durations. */
export function durationLabel(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return null
  const total = Math.round(seconds / 60)
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`
}

/** Metres as whole kilometres — the unit every screen shows travel in. */
export function toKm(metres: number | null | undefined): number {
  return Math.round((metres ?? 0) / 1000)
}

/** Metres as kilometres with one decimal, for a single day's distance. */
export function toKmPrecise(metres: number | null | undefined): number {
  return Math.round((metres ?? 0) / 100) / 10
}
