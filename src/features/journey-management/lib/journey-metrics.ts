/**
 * List-side pure helpers: the percentage bands, the sort translation, and the
 * month strip's week grouping.
 *
 * Nothing here recomputes a number the server already sends. Both percentages
 * arrive computed — including the case that matters most, **0% when their
 * denominator is zero**, never 100%.
 */
import type { MonthStripDay, QueueParams } from '../types'

/** Quality band — drives the meter colour. */
export type CompletionBand = 'low' | 'fair' | 'good'

/** Inclusive lower bounds for each band (below `fair` is `low`). */
export const COMPLETION_THRESHOLDS = { fair: 40, good: 65 } as const

export function completionBand(completion: number): CompletionBand {
  if (completion >= COMPLETION_THRESHOLDS.good) return 'good'
  if (completion >= COMPLETION_THRESHOLDS.fair) return 'fair'
  return 'low'
}

/**
 * Column id (the table's) → the API's `sort_by` value.
 *
 * Sorting by `status` uses **chain order** server-side (draft → published →
 * submitted → approved), not alphabetical — which is what makes it a worklist.
 */
export const SORT_COLUMNS: Record<string, QueueParams['sortBy']> = {
  inchargeName: 'sales_incharge',
  status: 'status',
  schedulingPercentage: 'scheduling',
  completionPercentage: 'completion',
  daysAllocated: 'days_allocated',
}

/**
 * Split a month's dates into ISO weeks (Mon–Sun) so the strip can leave a gap
 * between weeks — the grouping is what makes the pattern readable.
 * `firstWeekday` is the JS weekday of day 1 (0 = Sunday).
 */
export function groupIntoWeeks(
  strip: MonthStripDay[],
  firstWeekday: number,
): MonthStripDay[][] {
  const weeks: MonthStripDay[][] = []
  // Monday-based offset: how many slots day 1 sits into its own week.
  let slot = (firstWeekday + 6) % 7
  let current: MonthStripDay[] = []
  for (const day of strip) {
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
  no_cities_allocated: 'No cities allocated',
  allocation_incomplete: 'Allocation does not cover the month',
  schedule_unallocated: 'Scheduled outside the allocation',
  schedule_mismatch: 'Schedule does not match the counts',
  city_without_beats: 'Allocated city has no beats',
  beat_outside_city: 'Beat outside its day’s city',
  activity_not_allocatable: 'Activity not allocatable',
  awaiting_schedule: 'Awaiting the sales incharge’s schedule',
}

export function flagCodeLabel(code: string): string {
  return (
    FLAG_LABELS[code] ?? code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  )
}
