/**
 * Pure helpers for the location-tracking screens — no React, no API.
 *
 * Two rules this file exists to hold in one place:
 *
 *  1. **Coordinates are strings.** They are parsed to numbers here and only
 *     here, at the map's drawing boundary. Nothing stores the number back.
 *  2. **`tracked_date` is an IST calendar day, not an instant.** It is formatted
 *     with local getters — never `toISOString().slice(0, 10)`, which converts to
 *     UTC first and hands back the previous day for everyone east of UTC, which
 *     is everyone on this platform.
 */
import { addDays, format, parseISO } from 'date-fns'
import type { FixState, FleetFix, MapPoint } from '../types'

/** The server's own staleness threshold. Display hint only — never an accusation. */
export const STALE_AFTER_MINUTES = 15

/**
 * How a mock-location hit is worded, everywhere.
 *
 * `is_fake_location` is the *handset's own* report, stored as sent — so it is
 * flagged visibly (that is the reason the field exists) but described as
 * reported, never as fraud.
 */
export const MOCK_LOCATION_NOTE = 'Fake location reported by device'

/** How the approximate distance is labelled, everywhere. */
export const DISTANCE_NOTE =
  'Straight-line hops between fixes — under-reports corners taken between samples, and over-reports slightly from GPS jitter.'

/**
 * A coordinate pair as the map SDK needs it, or null when either half is
 * missing or unparseable. The strings themselves stay untouched on the row.
 */
export function toMapPoint(
  latitude: string | null | undefined,
  longitude: string | null | undefined,
): MapPoint | null {
  if (latitude == null || longitude == null) return null
  const point = { lat: Number(latitude), lng: Number(longitude) }
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) ? point : null
}

/**
 * Today as `yyyy-MM-dd`, read off local (IST) getters.
 *
 * `date-fns` `format` uses local parts, so this is the calendar day the user is
 * actually in — which is what `tracked_date` means.
 */
export function todayTracked(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Shift a `yyyy-MM-dd` day by ±n days.
 *
 * Local the whole way: `parseISO` on a date-only string builds local midnight,
 * and `format` reads local parts back out. No UTC conversion happens at either
 * end, which is the only way a calendar day survives the trip east of UTC.
 */
export function shiftTracked(date: string, delta: number): string {
  try {
    return format(addDays(parseISO(date), delta), 'yyyy-MM-dd')
  } catch {
    return date
  }
}

/** A `yyyy-MM-dd` day as "Mon, 04 Aug" — date-only, so no UTC shift. */
export function trackedDateLabel(date: string): string {
  try {
    return format(parseISO(date), 'EEE, dd MMM')
  } catch {
    return date
  }
}

/** An ISO-8601 instant as a clock time (`09:59 AM`) in the user's zone. */
export function fixTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return format(parseISO(iso), 'hh:mm a')
  } catch {
    return null
  }
}

/** An ISO-8601 instant as "27 Aug, 09:59 AM" (falls back to the raw value). */
export function fixStamp(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'd MMM, hh:mm a')
  } catch {
    return iso
  }
}

/**
 * The row's marker state.
 *
 * `no-signal` is its own state rather than a flavour of stale: nothing was heard
 * from this rep all day, which is a different fact from a fix that has aged out,
 * and it is the one the screen exists to surface.
 */
export function fixState(fix: FleetFix): FixState {
  if (!fix.hasFix) return 'no-signal'
  return fix.isStale ? 'stale' : 'fresh'
}

/**
 * How long ago the last fix landed.
 *
 * `last_seen_minutes_ago` is **floored** server-side — a 90-second-old fix reads
 * `1` — so the label never implies precision the number does not carry. `0`
 * becomes "under a minute" rather than "~0 min ago".
 */
export function lastSeenLabel(fix: FleetFix): string {
  if (!fix.hasFix || fix.lastSeenMinutesAgo == null) return 'No signal today'
  const minutes = fix.lastSeenMinutesAgo
  if (minutes <= 0) return 'Under a minute ago'
  if (minutes < 60) return `~${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `~${hours} hr ago` : `~${hours} hr ${rest} min ago`
}

/**
 * A boolean query param, as the API insists on receiving it.
 *
 * The endpoint accepts the literal `true` / `false` / `1` / `0` and answers
 * anything else with a deliberate 400 — so `false` is not sent as an empty
 * string, and an unset filter is **omitted entirely** rather than sent as
 * `""`, `null` or `undefined`.
 */
export function boolParam(value: boolean | undefined): 'true' | undefined {
  return value ? 'true' : undefined
}

/** Metres as kilometres with one decimal — the approximate day distance. */
export function toKmPrecise(metres: number | null | undefined): number {
  return Math.round((metres ?? 0) / 100) / 10
}

/**
 * Thin a long path for *drawing* only.
 *
 * The day is bounded server-side (roughly a point a minute), so this rarely
 * fires — but a stationary rep on a long shift can still push a polyline past
 * what is worth handing the map. Every point stays available to the timeline and
 * the inspector; only the drawn line is decimated, and the first and last points
 * are always kept so the route still starts and ends where the day did.
 */
export function simplifyPath<T>(points: T[], limit = 500): T[] {
  if (points.length <= limit) return points
  const step = Math.ceil(points.length / limit)
  const kept = points.filter((_, index) => index % step === 0)
  const last = points[points.length - 1]
  if (kept[kept.length - 1] !== last) kept.push(last)
  return kept
}
