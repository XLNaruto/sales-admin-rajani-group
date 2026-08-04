/**
 * The allocation's flags, prepared for display.
 *
 * Every number is the server's — the outlet exposure behind a flag and the
 * allocated/capacity split both come down in `facts`. This module only chooses
 * wording, category and severity.
 *
 * The flags **gate nothing**. There is no approval step, so an allocation with
 * flags is as live as one without; these are warnings on a live month, never a
 * blocking state.
 */
import { format, parseISO } from 'date-fns'
import type {
  FlagSeverity,
  IssueCategory,
  JourneyPlanDetail,
  PlanFlag,
  PlanIssue,
} from '../types'
import { dayOfMonth, todayISO } from './journey-format'

/** Completion bands used by the allocation's stat rail. */
export const COMPLETION_GOOD = 70
export const COMPLETION_FAIR = 40

/** A date as "15 Aug" (falls back to the raw ISO string). */
function dateLabel(date: string): string {
  try {
    return format(parseISO(date), 'd MMM')
  } catch {
    return date
  }
}

const CATEGORY: Record<string, IssueCategory> = {
  no_beats_allocated: 'allocation',
  beat_not_allocated: 'allocation',
  over_capacity: 'capacity',
  pinned_on_non_working_day: 'calendar',
}

/**
 * How loudly a flag reads.
 *
 * `no_beats_allocated` is the loudest thing on this screen: the rep has nothing
 * to work all month, and it is also why his completion reads 0%.
 * `pinned_on_non_working_day` is usually deliberate — the office pinned a holiday
 * — so it stays quiet.
 */
function severityOf(flag: PlanFlag): FlagSeverity {
  switch (flag.code) {
    case 'no_beats_allocated':
      return 'high'
    case 'beat_not_allocated':
      return 'high'
    case 'over_capacity':
      return 'medium'
    case 'pinned_on_non_working_day':
      return 'low'
    default:
      return 'medium'
  }
}

/** " — 34 outlets exposed", dropped when the flag names no beat. */
function exposure(outlets: number | null): string {
  if (outlets == null || outlets <= 0) return ''
  return ` — ${outlets} outlet${outlets === 1 ? '' : 's'} exposed`
}

/** One flag as a sentence, carrying the exposure the server measured. */
function labelOf(flag: PlanFlag): string {
  const beat = flag.beatName ?? 'A beat'
  const allocated = Number(flag.facts.allocated ?? NaN)
  const capacity = Number(flag.facts.capacity ?? NaN)
  const excess = Number(flag.facts.excess ?? NaN)

  switch (flag.code) {
    case 'no_beats_allocated':
      return 'No beats are on this month’s list — there is nothing for this rep to work.'
    case 'beat_not_allocated':
      // `beatName` is null by design here: no beat row survives to read one from,
      // so the outlet count is the only thing that can describe the exposure.
      return flag.beatName
        ? `${beat} is on the list but no longer allocated to this rep${exposure(flag.outletCount)}.`
        : `A listed beat is no longer allocated to this rep${exposure(flag.outletCount)}.`
    case 'over_capacity':
      if (Number.isFinite(allocated) && Number.isFinite(capacity)) {
        return `${allocated} beats listed against ${capacity} available dates${
          Number.isFinite(excess) && excess > 0 ? ` — ${excess} too many` : ''
        }.`
      }
      return 'More beats are listed than there are dates to work them.'
    case 'pinned_on_non_working_day':
      return `${
        flag.date ? dateLabel(flag.date) : 'A pinned date'
      } is pinned to a non-working activity — usually deliberate.`
    default:
      return `${flag.code.replace(/_/g, ' ')}.`
  }
}

/** Order rows read best in: worst first. */
const SEVERITY_RANK: Record<FlagSeverity, number> = { high: 0, medium: 1, low: 2 }

/** Every flag the allocation carries, worst first. */
export function planIssues(plan: JourneyPlanDetail): PlanIssue[] {
  const rows: PlanIssue[] = plan.flags.map((flag) => ({
    code: flag.code,
    category: CATEGORY[flag.code] ?? 'allocation',
    severity: severityOf(flag),
    label: labelOf(flag),
    day: flag.date ? dayOfMonth(flag.date) : undefined,
  }))

  return rows.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

/**
 * A locked day is history — the server refuses to move it, and a `pinned_days`
 * replacement leaves it standing whatever we send.
 *
 * The server locks a day as a visit lands on it, so today and every earlier date
 * are already history there whether or not this copy carries the flag yet.
 * Comparing the calendar date is what keeps the screen honest — string comparison
 * on `yyyy-MM-dd`, never a `Date` round-trip (see journey-format).
 */
export function isLocked(day: {
  date: string
  locked: boolean
  lockedAt: string | null
}): boolean {
  return day.locked || Boolean(day.lockedAt) || day.date <= todayISO()
}

/**
 * Can the admin still pin this date?
 *
 * Two things survive a pinned-days replacement regardless of what we send: a
 * locked day, and a date the **rep has already taken over**. Offering a control
 * for either would promise a change the server will drop.
 */
export function isPinnable(day: {
  date: string
  origin: 'rep' | 'pinned'
  locked: boolean
  lockedAt: string | null
}): boolean {
  return !isLocked(day) && day.origin === 'pinned'
}
