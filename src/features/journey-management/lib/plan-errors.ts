/**
 * The plan writes' 400s, turned into a sentence that names the offending row.
 *
 * The server's `message` is always shown — it is written to be read — but it
 * describes the rule, not *which* of thirty buckets broke it. Every one of these
 * refusals carries `details` naming the row (an `activity_id`, a `date`, a list
 * of `distributor_ids`), and pointing at it is the difference between "fix your
 * allocation" and "the 8th is already worked".
 *
 * Matched on the body's `error` code, never on the message text. An unknown code
 * yields nothing and the caller falls back to the server's own message.
 */
import { ApiError, errorCode } from '@/lib/api-error'
import { dayLabel } from './journey-format'

/** The `details` shapes the journey-plan refusals send. */
interface PlanErrorDetails {
  activity_id?: number
  code?: string
  date?: string
  days_count?: number
  date_count?: number
  period_month?: string
  city_id?: string | number
  distributor_ids?: (string | number)[]
  activity_code?: string
}

function detailsOf(error: unknown): PlanErrorDetails {
  const raw = error instanceof ApiError ? error.details : undefined
  return raw && typeof raw === 'object' ? (raw as PlanErrorDetails) : {}
}

/**
 * A pointer at the row a refusal is about, or `null` when the code is one this
 * screen has nothing to add to.
 *
 * `activityName` resolves an `activity_id` to something the admin recognises —
 * the id alone is not a thing anyone can see on the screen.
 */
export function planErrorHint(
  error: unknown,
  activityName: (activityId: number) => string | undefined,
): string | null {
  const code = errorCode(error)
  if (!code) return null
  const details = detailsOf(error)
  const activity =
    details.activity_id != null
      ? (activityName(details.activity_id) ?? details.code ?? details.activity_code)
      : (details.code ?? details.activity_code)
  const date = details.date ? dayLabel(details.date) : null

  switch (code) {
    case 'JOURNEY_PLAN_ACTIVITY_DISTRIBUTORS_REQUIRED':
      return `${activity ?? 'One activity'} has to name at least one distributor.`
    case 'JOURNEY_PLAN_ACTIVITY_DISTRIBUTORS_NOT_ALLOWED':
      return `${activity ?? 'That activity'} does not call on distributors — clear them from the row.`
    case 'JOURNEY_PLAN_DISTRIBUTOR_NOT_REACHABLE':
      return 'One of those distributors is not served by any beat he holds. Fix the beat allocation, or pick another.'
    case 'JOURNEY_PLAN_FIXED_DATES_EXCEED_COUNT':
      return `${activity ?? 'One bucket'} fixes ${details.date_count ?? 'more'} dates against ${
        details.days_count ?? 'fewer'
      } days. Raise the count, or drop a date.`
    case 'JOURNEY_PLAN_DATE_OUT_OF_PERIOD':
      return `${date ?? 'One fixed date'} is outside ${details.period_month ?? 'the plan’s month'}.`
    case 'JOURNEY_PLAN_DAY_LOCKED':
      return `${date ?? 'One fixed date'} is already worked, so it cannot be re-planned.`
    case 'JOURNEY_PLAN_DUPLICATE_FIXED_DATE':
      return `${date ?? 'One date'} is fixed twice for ${activity ?? 'the same activity'}.`
    // The entry-level rule, as opposed to the bucket-level
    // `..._ACTIVITY_DISTRIBUTORS_REQUIRED` above it: field selling is charged to
    // a distributor, so a dated entry without one has nobody's days to spend.
    case 'JOURNEY_PLAN_DISTRIBUTOR_REQUIRED':
      return `The ${activity ?? 'work'} on ${date ?? 'one date'} names no distributor. Pick one on that row, or remove it.`
    case 'JOURNEY_PLAN_VISIT_DISTRIBUTORS_REQUIRED':
      return `The visit on ${date ?? 'one date'} names nobody to call on.`
    case 'JOURNEY_PLAN_VISIT_DISTRIBUTORS_NOT_ALLOWED':
      return `The work on ${date ?? 'one date'} does not call on distributors — clear them from the entry.`
    case 'JOURNEY_PLAN_ENTRY_PINNED':
      return `${date ?? 'One date'} carries work you fixed from the allocation. It is kept whatever is sent — reload the plan and correct the bucket's dates instead.`
    default:
      return null
  }
}
