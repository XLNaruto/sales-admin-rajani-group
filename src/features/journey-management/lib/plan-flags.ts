/**
 * The plan's flags, prepared for display.
 *
 * Every number is the server's — bucket counts, day counts and beat counts all
 * come down in `facts`. This module only chooses wording, category and severity.
 *
 * **None of them blocks anything.** The admin allocates the work he cares about
 * and the sales incharge fills the rest of the month, so publish no longer wants
 * the counts to add up and approve no longer re-checks them. Every flag here is
 * something to look at and judge — the wording says what happened and leaves the
 * decision where it belongs.
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

const CATEGORY: Record<string, IssueCategory> = {
  no_distributors_allocated: 'allocation',
  allocation_over_month: 'allocation',
  schedule_mismatch: 'schedule',
  schedule_unallocated: 'schedule',
  distributor_without_beats: 'master-data',
  beat_outside_distributor: 'master-data',
  activity_not_allocatable: 'schedule',
  awaiting_schedule: 'schedule',
}

/**
 * How loudly a flag reads.
 *
 * `no_distributors_allocated` is the only `high` one left: a month with no field
 * allocation at all is one nobody has actually planned, and it is the one thing
 * here the admin certainly has to act on.
 *
 * `schedule_unallocated` is deliberately **low**. Under the old model it was a
 * refusal; now it is the expected shape of a healthy month — the days the sales
 * incharge filled in himself, which is exactly what he is meant to do.
 */
function severityOf(flag: PlanFlag): FlagSeverity {
  switch (flag.code) {
    case 'no_distributors_allocated':
      return 'high'
    case 'allocation_over_month':
    case 'schedule_mismatch':
    case 'distributor_without_beats':
    case 'beat_outside_distributor':
    case 'activity_not_allocatable':
      return 'medium'
    case 'schedule_unallocated':
    case 'awaiting_schedule':
      return 'low'
    default:
      return 'medium'
  }
}

/** The bucket a flag points at, named however the server named it. */
function bucketName(flag: PlanFlag): string {
  return flag.distributorName ?? flag.cityName ?? flag.activityName ?? 'A bucket'
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
    case 'no_distributors_allocated':
      return 'No distributors are allocated, so nothing about this month says where the sales incharge is meant to sell. Add at least one before publishing.'

    case 'allocation_over_month':
      // Reachable — a date carrying two entries spends two days — so this is a
      // fact to weigh, not an error to clear.
      if (Number.isFinite(allocated) && Number.isFinite(total)) {
        return `The counts promise ${allocated} days of work in a ${total}-day month — ${variance(
          allocated - total,
        )}. He can only fit that by doubling dates up.`
      }
      return 'The counts promise more work than the month holds. He can only fit that by doubling dates up.'

    case 'schedule_unallocated':
      // The ordinary shape of a healthy month, not a defect: the admin allocates
      // part of it and the sales incharge fills the rest as he judges right.
      return flag.date
        ? `${dateLabel(flag.date)} carries work the allocation never covered — the sales incharge's own.`
        : 'Some entries fall outside every bucket — days the sales incharge filled in himself.'

    case 'schedule_mismatch':
      if (Number.isFinite(allocated) && Number.isFinite(scheduled)) {
        return `${bucketName(flag)}: ${scheduled} day${
          scheduled === 1 ? '' : 's'
        } scheduled against ${allocated} allocated — ${variance(scheduled - allocated)}.`
      }
      return `${bucketName(flag)} does not match its allocated count.`

    case 'distributor_without_beats':
      // Not a scheduling error and not fixable here: the beat master moved under
      // an allocation that was correct when it was made.
      return `${bucketName(
        flag,
      )} is allocated days but the sales incharge holds no beat serving it — fix it in the beat master, or move the days elsewhere.`

    case 'beat_outside_distributor':
      return `${flag.beatName ?? 'A scheduled beat'}${
        flag.date ? ` on ${dateLabel(flag.date)}` : ''
      } no longer serves ${
        flag.distributorName ?? 'that entry\u2019s distributor'
      } — the beat master has drifted since it was scheduled${
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
