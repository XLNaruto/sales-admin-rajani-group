/**
 * Live-map helpers — grouping and filtering only.
 *
 * Every headline number (calls, productivity, days on field, distance) comes back
 * in `totals`, and the nine trail-chip counts come back in `facets`. Those get
 * compared against FieldAssist's figures on day one, so they are displayed, never
 * recomputed here. What is left is deciding which days belong to a scope and which
 * markers a filter keeps.
 */
import type {
  DayFacets,
  DayScope,
  DayVisit,
  LiveDayDetail,
  LiveMonthTotals,
  RepDaySummary,
  ScheduledOutlet,
  TrailFilter,
} from '../types'

/** Productivity bands — a strike rate below `FAIR` is worth a phone call. */
export const PRODUCTIVITY_GOOD = 60
export const PRODUCTIVITY_FAIR = 35

/**
 * The day was worked in the field.
 *
 * By `status`, not by call count: status answers *did he work* and the activity
 * answers *at what*. A day of official work is on field even with no calls on it.
 */
export function isOnField(day: RepDaySummary): boolean {
  return day.status === 'worked' || day.status === 'official_work'
}

/** The day's GPS trail tripped the mock-location check. */
export function isFlagged(day: RepDaySummary): boolean {
  return day.mockSuspectedCount > 0
}

/** Days belonging to a scope — "off" is every day not worked in the field. */
export function daysInScope(days: RepDaySummary[], scope: DayScope): RepDaySummary[] {
  switch (scope) {
    case 'on-field':
      return days.filter(isOnField)
    case 'off':
      return days.filter((day) => !isOnField(day))
    default:
      return days
  }
}

/**
 * Counts for the scope pills, taken from the server's `totals` — they are
 * computed over the whole range, which is the same range the grid shows.
 */
export function scopeCounts(totals: LiveMonthTotals): Record<DayScope, number> {
  return {
    all: totals.days,
    'on-field': totals.daysOnField,
    off: totals.offDays,
  }
}

/** Badge tone for a day — a day that wasn't worked reads differently. */
export function activityTone(day: RepDaySummary): 'default' | 'secondary' | 'warning' {
  if (!isOnField(day)) return 'secondary'
  return day.status === 'worked' ? 'default' : 'warning'
}

/** What to show as the day's activity, falling back to its status. */
export function activityLabel(day: RepDaySummary): string {
  if (day.activityName) return day.activityName
  return STATUS_LABEL[day.status] ?? '—'
}

export const STATUS_LABEL: Record<string, string> = {
  worked: 'Worked',
  official_work: 'Official work',
  leave: 'Leave',
  holiday: 'Holiday',
  weekly_off: 'Weekly off',
  not_started: 'Not started',
}

/* ─────────────────────────── one day's trail ──────────────────────────────── */

/** Facet key behind each trail chip — the chips are the server's nine numbers. */
const FACET_OF: Record<Exclude<TrailFilter, 'all'>, keyof DayFacets> = {
  'in-turn': 'inTurn',
  telephonic: 'telephonic',
  ovt: 'ovt',
  ovc: 'ovc',
  'joint-working': 'jointWorking',
  distributor: 'distributor',
  'official-work': 'officialWork',
  'not-visited': 'notVisited',
  productive: 'productive',
}

/** How many markers a legend chip stands for, so a `0` chip can read as empty. */
export function trailCount(detail: LiveDayDetail, filter: TrailFilter): number {
  if (filter === 'all') return detail.timeline.length + detail.notVisited.length
  return detail.facets[FACET_OF[filter]] ?? 0
}

/** The calls a trail filter keeps — `not-visited` keeps none, by definition. */
export function visitsInFilter(detail: LiveDayDetail, filter: TrailFilter): DayVisit[] {
  switch (filter) {
    case 'all':
      return detail.timeline
    case 'not-visited':
      return []
    case 'productive':
      return detail.timeline.filter((visit) => visit.productive)
    default:
      return detail.timeline.filter((visit) => visit.kind === filter)
  }
}

/** Planned stops a filter keeps — only `all` and `not-visited` show them. */
export function missesInFilter(
  detail: LiveDayDetail,
  filter: TrailFilter,
): ScheduledOutlet[] {
  return filter === 'all' || filter === 'not-visited' ? detail.notVisited : []
}

/** Only the markers that carry a fix can be drawn. */
export function withPoint<T extends { point: unknown }>(
  items: T[],
): (T & { point: NonNullable<T['point']> })[] {
  return items.filter(
    (item): item is T & { point: NonNullable<T['point']> } => item.point != null,
  )
}

/** Wording for a route that cannot be drawn, so the gap explains itself. */
export function routeStateNote(state: string): string | null {
  switch (state) {
    case 'no_day_start':
      return 'No check-in on this day, so there is no anchor to draw a route from — the pins are still the calls that were punched.'
    case 'no_mapped_points':
      return 'Nothing on this day carried a GPS fix, so there is no route to draw.'
    default:
      return null
  }
}
