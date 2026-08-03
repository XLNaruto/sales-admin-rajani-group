/**
 * The plan detail's flags, prepared for display.
 *
 * The numbers are the server's — coverage, the scheduled/required split and the
 * outlet exposure behind each flag are all computed there, and `flags[]` is
 * capped with the tail rolled into `flagSummary`. The client cannot recompute
 * that remainder: it never received the beats it summarises. So this module only
 * chooses wording, category and severity, and appends the rollup as a final row.
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

/** Coverage bands used by the plan's stat rail, matching the queue's thresholds. */
export const COVERAGE_GOOD = 70
export const COVERAGE_FAIR = 40

/** A plan date as "15 Aug" (falls back to the raw ISO string). */
function dateLabel(date: string): string {
  try {
    return format(parseISO(date), 'd MMM')
  } catch {
    return date
  }
}

/** English pluralisation for the one word these labels need it for. */
function times(n: number): string {
  return n === 1 ? '1 time' : `${n} times`
}

const CATEGORY: Record<string, IssueCategory> = {
  beat_under_covered: 'coverage',
  remaining: 'coverage',
  day_missing_beat: 'activity',
  displaced_by_non_working_day: 'calendar',
}

function severityOf(flag: PlanFlag): FlagSeverity {
  const scheduled = Number(flag.facts.scheduled ?? NaN)
  switch (flag.code) {
    case 'day_missing_beat':
      return 'high'
    case 'beat_under_covered':
      return scheduled === 0 ? 'high' : 'medium'
    case 'displaced_by_non_working_day':
      return 'low'
    default:
      return 'medium'
  }
}

/** One flag as a sentence, carrying the exposure the server measured. */
function labelOf(flag: PlanFlag): string {
  const beat = flag.beatName ?? 'A beat'
  const outlets = flag.outletCount
  const scheduled = Number(flag.facts.scheduled ?? NaN)
  const required = Number(flag.facts.required ?? NaN)

  switch (flag.code) {
    case 'beat_under_covered':
      if (scheduled === 0) {
        return outlets != null
          ? `${beat} is never visited this month — all ${outlets} outlets uncovered.`
          : `${beat} is never visited this month.`
      }
      if (Number.isFinite(scheduled) && Number.isFinite(required)) {
        return `${beat} is scheduled ${times(scheduled)} against a cycle of ${required}${
          outlets != null ? ` — ${outlets} outlets exposed` : ''
        }.`
      }
      return `${beat} misses its visit cycle.`
    case 'day_missing_beat':
      return `${flag.date ? dateLabel(flag.date) : 'A working day'} has no beat scheduled.`
    case 'displaced_by_non_working_day':
      return `${beat}'s visit moved off ${
        flag.date ? dateLabel(flag.date) : 'a non-working day'
      } — that day isn't worked.`
    default:
      return `${beat}: ${flag.code.replace(/_/g, ' ')}.`
  }
}

/** Order rows read best in: worst first. */
const SEVERITY_RANK: Record<FlagSeverity, number> = { high: 0, medium: 1, low: 2 }

/**
 * Every flag the plan carries, worst first, with the rolled-up remainder as the
 * last row when there is one.
 */
export function planIssues(plan: JourneyPlanDetail): PlanIssue[] {
  const rows: PlanIssue[] = plan.flags.map((flag) => ({
    code: flag.code,
    category: CATEGORY[flag.code] ?? 'workload',
    severity: severityOf(flag),
    label: labelOf(flag),
    day: flag.date ? dayOfMonth(flag.date) : undefined,
  }))

  rows.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])

  const rest = plan.flagSummary
  if (rest && rest.remainingCount > 0) {
    rows.push({
      code: 'remaining',
      category: 'coverage',
      severity: 'low',
      rollup: true,
      label: `${rest.remainingBeatCount} more allocated beats miss their cycle — ${rest.remainingOutletCount} outlets between them.`,
    })
  }

  return rows
}

/**
 * A locked day is history — its activity and beats are read-only.
 *
 * The server locks a day as it starts, so today and every earlier date are already
 * history there whether or not this plan's copy carries the flag yet: a plan fetched
 * yesterday, or one the nightly lock hasn't reached, still shows stale `locked:
 * false` days. Comparing the calendar date is what keeps the screen honest — string
 * comparison on `yyyy-MM-dd`, never a `Date` round-trip (see journey-format).
 */
export function isLocked(day: {
  date: string
  locked: boolean
  lockedAt: string | null
}): boolean {
  return day.locked || Boolean(day.lockedAt) || day.date <= todayISO()
}

/** Can this plan still be edited? An approved month is closed to changes. */
export function isEditable(plan: JourneyPlanDetail | undefined): boolean {
  return plan != null && plan.status !== 'approved' && plan.status !== 'superseded'
}
