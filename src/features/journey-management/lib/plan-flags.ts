/**
 * The plan's flags, prepared for display.
 *
 * Every number is the server's — bucket counts, day counts and beat counts all
 * come down in `facts`. This module only chooses wording, category and severity.
 *
 * **Three of the eight flags mirror a refusal** and so genuinely gate a
 * transition: `allocation_incomplete` blocks publish, `schedule_unallocated` and
 * `schedule_mismatch` block approve. They get their own `blocking` category, so a
 * flag that merely wants attention never reads like one that stops the month.
 */
import { format, parseISO } from 'date-fns'
import type {
  FlagSeverity,
  IssueCategory,
  JourneyPlanDetail,
  PlanFlag,
  PlanIssue,
} from '../types'
import { dayOfMonth } from './journey-format'

/** Scheduling / completion bands used by the plan's stat rail. */
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

/** Which transition a flag mirrors the refusal of, when it mirrors one. */
const BLOCKS: Record<string, 'publish' | 'approve'> = {
  allocation_incomplete: 'publish',
  schedule_unallocated: 'approve',
  schedule_mismatch: 'approve',
}

const CATEGORY: Record<string, IssueCategory> = {
  no_cities_allocated: 'allocation',
  allocation_incomplete: 'blocking',
  schedule_unallocated: 'blocking',
  schedule_mismatch: 'blocking',
  city_without_beats: 'master-data',
  beat_outside_city: 'master-data',
  activity_not_allocatable: 'schedule',
  awaiting_schedule: 'schedule',
}

/**
 * How loudly a flag reads.
 *
 * The three that block a transition are `high`, because the admin cannot move the
 * month on until each is gone. `awaiting_schedule` stays `low`: a published month
 * the sales incharge has not started is a normal Tuesday, not a fault.
 */
function severityOf(flag: PlanFlag): FlagSeverity {
  switch (flag.code) {
    case 'allocation_incomplete':
    case 'schedule_unallocated':
    case 'schedule_mismatch':
    case 'no_cities_allocated':
      return 'high'
    case 'city_without_beats':
    case 'beat_outside_city':
    case 'activity_not_allocatable':
      return 'medium'
    case 'awaiting_schedule':
      return 'low'
    default:
      return 'medium'
  }
}

/** The bucket a flag points at, named however the server named it. */
function bucketName(flag: PlanFlag): string {
  return flag.cityName ?? flag.activityName ?? 'A bucket'
}

/** A signed day count as "2 days short" / "3 days exceeded". */
function variance(value: number): string {
  if (!Number.isFinite(value) || value === 0) return 'out by 0 days'
  return value < 0
    ? `${Math.abs(value)} day${Math.abs(value) === 1 ? '' : 's'} short`
    : `${value} day${value === 1 ? '' : 's'} exceeded`
}

/** One flag as a sentence, carrying the numbers the server measured. */
function labelOf(flag: PlanFlag): string {
  const allocated = Number(flag.facts.days_count ?? flag.facts.allocated ?? NaN)
  const scheduled = Number(flag.facts.days_scheduled ?? flag.facts.scheduled ?? NaN)
  const total = Number(flag.facts.total_days ?? NaN)
  const outlets = Number(flag.facts.outlet_count ?? NaN)

  switch (flag.code) {
    case 'no_cities_allocated':
      return 'No cities are allocated, so the sales incharge has nowhere to work — publishing will be refused.'

    case 'allocation_incomplete':
      // The variance is the actionable number: how many days to add or take away
      // before publish stops refusing.
      if (Number.isFinite(allocated) && Number.isFinite(total)) {
        return `The counts cover ${allocated} of ${total} days — ${variance(
          allocated - total,
        )}. Publish is refused until they add up.`
      }
      return 'The counts do not account for the whole month. Publish is refused until they add up.'

    case 'schedule_unallocated':
      return flag.date
        ? `${dateLabel(
            flag.date,
          )} is scheduled to something the allocation never covered. Approve is refused until it is corrected.`
        : 'Some scheduled dates fall outside every bucket. Approve is refused until they are corrected.'

    case 'schedule_mismatch':
      if (Number.isFinite(allocated) && Number.isFinite(scheduled)) {
        return `${bucketName(flag)}: ${scheduled} day${
          scheduled === 1 ? '' : 's'
        } scheduled against ${allocated} allocated — ${variance(
          scheduled - allocated,
        )}. Approve is refused until every bucket matches exactly.`
      }
      return `${bucketName(
        flag,
      )} does not match its allocated count. Approve is refused until every bucket matches exactly.`

    case 'city_without_beats':
      // Not a scheduling error and not fixable here: the beat master moved under
      // an allocation that was correct when it was made.
      return `${bucketName(
        flag,
      )} is allocated days but the sales incharge no longer holds any beats there — fix it in the beat master, or move the days elsewhere.`

    case 'beat_outside_city':
      return `${flag.beatName ?? 'A scheduled beat'}${
        flag.date ? ` on ${dateLabel(flag.date)}` : ''
      } no longer sits in that day's city — the beat master has drifted since approval${
        Number.isFinite(outlets) && outlets > 0 ? ` (${outlets} outlets)` : ''
      }.`

    case 'activity_not_allocatable':
      return `${
        flag.activityName ?? 'An activity'
      }${flag.date ? ` on ${dateLabel(flag.date)}` : ''} is not one the admin may allocate.`

    case 'awaiting_schedule':
      return 'Published, and the sales incharge has not started dating the month yet.'

    default:
      return `${flag.code.replace(/_/g, ' ')}.`
  }
}

/** Order rows read best in: worst first. */
const SEVERITY_RANK: Record<FlagSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

/**
 * Every flag the plan carries, worst first.
 *
 * `schedule_mismatch` is deliberately **silent server-side until the sales incharge has
 * scheduled something** — every bucket of an untouched month is mismatched by its
 * full count, and forty rows of that is noise, not information — so nothing here
 * needs to suppress it.
 */
export function planIssues(plan: JourneyPlanDetail): PlanIssue[] {
  const rows: PlanIssue[] = plan.flags.map((flag) => ({
    code: flag.code,
    category: CATEGORY[flag.code] ?? 'allocation',
    severity: severityOf(flag),
    label: labelOf(flag),
    day: flag.date ? dayOfMonth(flag.date) : undefined,
    blocks: BLOCKS[flag.code],
  }))

  return rows.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

/**
 * A locked day is history — a visit landed on it, and the correction pass leaves it
 * standing whatever is sent.
 *
 * **Only the server's own fields count.** It would be tempting to also treat any
 * past date as history, but that is strictly *stricter* than the server: a
 * scheduled date that passed with no visit is `missed`, not locked, and the
 * correction pass will happily rewrite it. Inferring from the calendar would grey
 * out rows the server would accept — and a control that refuses a legal edit is a
 * worse lie than one whose edit gets skipped, because the skip is reported.
 *
 * A row this copy has not caught up on yet (the sales incharge opened the day a moment ago) is
 * handled the same way: the save reports the dates that did not move.
 */
export function isLocked(day: { locked: boolean; lockedAt: string | null }): boolean {
  return day.locked || Boolean(day.lockedAt)
}
