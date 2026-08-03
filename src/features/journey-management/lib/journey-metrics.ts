/**
 * Queue-side pure helpers: coverage bands, the segment → query translation, and
 * the rhythm strip's week grouping.
 *
 * Nothing here recomputes a number the server already sends. The queue's cards
 * and tab badges come from its `summary` (computed over the whole period, not the
 * page), so the only arithmetic left is turning UI choices into query params.
 */
import type { QueueParams, QueueSegment, RhythmDay } from '../types'

/** Coverage quality band — drives the meter colour and the coverage facet. */
export type CoverageBand = 'low' | 'fair' | 'good'

/** Inclusive lower bounds for each band (below `fair` is `low`). */
export const COVERAGE_THRESHOLDS = { fair: 40, good: 65 } as const

export function coverageBand(coverage: number): CoverageBand {
  if (coverage >= COVERAGE_THRESHOLDS.good) return 'good'
  if (coverage >= COVERAGE_THRESHOLDS.fair) return 'fair'
  return 'low'
}

/** The `coverage_min` / `coverage_max` pair a band asks the API for. */
export function coverageRange(
  band: string,
): { coverageMin?: number; coverageMax?: number } {
  switch (band) {
    case 'low':
      return { coverageMin: 0, coverageMax: COVERAGE_THRESHOLDS.fair - 1 }
    case 'fair':
      return { coverageMin: COVERAGE_THRESHOLDS.fair, coverageMax: COVERAGE_THRESHOLDS.good - 1 }
    case 'good':
      return { coverageMin: COVERAGE_THRESHOLDS.good, coverageMax: 100 }
    default:
      return {}
  }
}

/**
 * What a queue segment means to the API.
 *
 * "Clean" and "Needs a look" are the `has_flags` boolean; "Pending" and "Approved"
 * are statuses. They are separate query params, so a segment maps to at most one
 * of each and never to a client-side pass over the rows.
 */
export function segmentQuery(
  segment: QueueSegment,
): Pick<QueueParams, 'status' | 'hasFlags'> {
  switch (segment) {
    case 'pending':
      return { status: 'pending_approval' }
    case 'clean':
      return { hasFlags: false }
    case 'needs-look':
      return { hasFlags: true }
    case 'approved':
      return { status: 'approved' }
    default:
      return {}
  }
}

/** Column id (the table's) → the API's `sort_by` value. */
export const SORT_COLUMNS: Record<string, QueueParams['sortBy']> = {
  inchargeName: 'sales_incharge',
  coverage: 'coverage',
  workingDays: 'working_days',
  beats: 'beats_scheduled',
}

/**
 * Split a month's days into ISO weeks (Mon–Sun) so the rhythm strip can leave a
 * gap between weeks — the grouping is what makes the pattern readable.
 * `firstWeekday` is the JS weekday of day 1 (0 = Sunday).
 */
export function groupIntoWeeks(rhythm: RhythmDay[], firstWeekday: number): RhythmDay[][] {
  const weeks: RhythmDay[][] = []
  // Monday-based offset: how many slots day 1 sits into its own week.
  let slot = (firstWeekday + 6) % 7
  let current: RhythmDay[] = []
  for (const day of rhythm) {
    current.push(day)
    slot += 1
    if (slot === 7) {
      weeks.push(current)
      current = []
      slot = 0
    }
  }
  if (current.length) weeks.push(current)
  return weeks
}

/**
 * Human wording for a flag code. The server sends stable machine codes so the
 * client can brand on them; the copy belongs here.
 */
const FLAG_LABELS: Record<string, string> = {
  beat_under_covered: 'Beat under-covered',
  day_missing_beat: 'Day with no beat',
  displaced_by_non_working_day: 'Displaced by a non-working day',
  remaining: 'Other beats short of their cycle',
}

export function flagCodeLabel(code: string): string {
  return (
    FLAG_LABELS[code] ?? code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  )
}
