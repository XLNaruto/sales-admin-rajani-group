/**
 * Activity lookups over the server's master (`GET /activities`).
 *
 * The master is tenant-editable and the solver reads its three booleans, so
 * nothing here hard-codes them: a screen that needs to know whether a day takes
 * beats looks the day's activity up in the list it was given. Only the *kind* of
 * a day (worked / off / holiday / leave) is derived from the code, because the
 * rhythm strip has to colour days it has no master row for.
 */
import type { ActivityCode, ActivityDef, DayKind } from '../types'

/** The three seeded codes that mean "not worked", each for its own reason. */
export const NON_WORKING_CODES: Record<string, DayKind> = {
  weekly_off: 'weekly-off',
  holiday: 'holiday',
  leave: 'leave',
}

/** Seeded working activities that carry no beats — the fallback's short list. */
const BEATLESS_CODES = new Set([
  'distributor_visit',
  'distributor_search',
  'depot_visit',
  'head_office_visit',
  'meeting',
  'training',
])

/**
 * Is this a working code that legitimately carries no beats (a meeting, a depot
 * visit)? Code-only, for the places that have a code but no master row — the
 * rhythm strip, whose days carry no `activityId`.
 */
export function isBeatlessCode(code: ActivityCode | null | undefined): boolean {
  return BEATLESS_CODES.has(code ?? '')
}

/** What kind of day an activity code makes — anything unknown is a worked day. */
export function dayKindOf(code: ActivityCode | null | undefined): DayKind {
  return NON_WORKING_CODES[code ?? ''] ?? 'working'
}

/** Look an activity up by code. */
export function activityByCode(
  activities: ActivityDef[],
  code: ActivityCode | null | undefined,
): ActivityDef | undefined {
  return activities.find((activity) => activity.code === code)
}

/** Look an activity up by id — what a day carries, and what a PATCH is keyed on. */
export function activityById(
  activities: ActivityDef[],
  id: number | null | undefined,
): ActivityDef | undefined {
  return activities.find((activity) => activity.id === id)
}

/** The day's master row, by id first and code second. */
function activityOfDay(
  activities: ActivityDef[],
  day: { activityId: number; activityCode: ActivityCode },
): ActivityDef | undefined {
  return (
    activityById(activities, day.activityId) ?? activityByCode(activities, day.activityCode)
  )
}

/**
 * Does this day take beats?
 *
 * Falls back to the day's own code while the master is still loading: the seeded
 * codes that carry no beats are known, and assuming `true` for an unknown code is
 * the safer error — it shows the picker rather than hiding a day's beats.
 */
export function requiresBeat(
  activities: ActivityDef[],
  day: { activityId: number; activityCode: ActivityCode },
): boolean {
  const activity = activityOfDay(activities, day)
  if (activity) return activity.requiresBeat
  return dayKindOf(day.activityCode) === 'working' && !BEATLESS_CODES.has(day.activityCode)
}

/** Is this a working day? Same fallback, from the code. */
export function isWorkingDay(
  activities: ActivityDef[],
  day: { activityId: number; activityCode: ActivityCode },
): boolean {
  const activity = activityOfDay(activities, day)
  return activity ? activity.working : dayKindOf(day.activityCode) === 'working'
}
