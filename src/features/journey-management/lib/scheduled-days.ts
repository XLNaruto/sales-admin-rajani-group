/**
 * How many days of the calendar are charged to each allocation bucket — read off
 * the **draft**, not off the server.
 *
 * The plan's own `days_scheduled` per bucket is authoritative, but it only moves
 * when the calendar is saved. The admin edits the calendar and the counts on one
 * screen, so without this the allocation above a correction pass keeps reporting
 * yesterday's figure — "5 scheduled" under a bucket he has just emptied — and the
 * `schedule_mismatch` warning fires on the stale number.
 *
 * Pure, so the charging rule is testable on its own and stays out of the editor.
 */
import { bucketKey, type BucketDraft } from './allocation-buckets'

/** The part of a piece of work that decides which bucket pays for it. */
export interface ChargeableEntry {
  /**
   * The date the work sits on, `yyyy-MM-dd`. Carried so the buckets can report
   * WHICH dates they hold and not merely how many — the allocation's date picker
   * shows them, and it has to show the calendar on screen rather than the one the
   * server last saved.
   */
  date: string
  activityId: number
  /**
   * Set → the day is field selling and is charged to that distributor's bucket.
   * Null → it is charged to the activity bucket. This mirrors the entry model:
   * `distributorId` names the bucket, `distributorIds` only names who is called on.
   */
  distributorId: string | null
  cityId: string | null
}

export interface ScheduledDays {
  /**
   * Days charged, keyed by `bucketKey` — activity AND city, never the activity
   * alone. **Entries, not dates**: two visits to two distributors on one date
   * spend two of the month's days, and the count is what the allocation is
   * measured against.
   */
  activity: Map<string, number>
  /** Keyed by distributor id. */
  distributor: Map<string, number>
  /**
   * The DISTINCT dates behind each activity count, same keys. A set, so a date
   * carrying the bucket twice appears once — this drives a calendar, where a
   * date is either held or not.
   */
  activityDates: Map<string, Set<string>>
  /** The same, per distributor bucket. */
  distributorDates: Map<string, Set<string>>
}

const bump = (map: Map<string, number>, key: string) =>
  map.set(key, (map.get(key) ?? 0) + 1)

const hold = (map: Map<string, Set<string>>, key: string, date: string) => {
  const dates = map.get(key)
  if (dates) dates.add(date)
  else map.set(key, new Set([date]))
}

/**
 * Charge every entry to a bucket.
 *
 * `activityBuckets` is passed in because the city is part of an activity bucket's
 * identity but is only *sometimes* carried on the entry — a search names its city,
 * a meeting has none. So an entry that does not match a bucket on the pair falls
 * back to the only bucket holding that activity, and is counted under its own key
 * when the activity is split across cities and the entry says nothing.
 */
/**
 * Which bucket an entry is charged to, as a resolver built once per bucket set.
 *
 * Shared so that "which bucket holds this date" and "remove this bucket from
 * this date" cannot drift apart: the fallback below is a real rule, and a second
 * copy of it that matched only on the city pair would fail to remove exactly the
 * entries this function had counted.
 */
export function chargeResolver(activityBuckets: BucketDraft[]) {
  const byPair = new Set(activityBuckets.map(bucketKey))
  /** Activity id → its only bucket's key, for activities allocated once. */
  const soleBucket = new Map<string, string | null>()
  for (const bucket of activityBuckets) {
    soleBucket.set(bucket.id, soleBucket.has(bucket.id) ? null : bucketKey(bucket))
  }

  /**
   * `null` for a picker with no activity on it yet — it is dropped on save, so it
   * must not spend a day either. Otherwise the side it is charged to and the key
   * within that side.
   */
  return (
    entry: Omit<ChargeableEntry, 'date'>,
  ): { side: 'activity' | 'distributor'; key: string } | null => {
    if (!entry.activityId) return null
    if (entry.distributorId) {
      return { side: 'distributor', key: entry.distributorId }
    }
    const id = String(entry.activityId)
    const pair = `${id}|${entry.cityId ?? ''}`
    return {
      side: 'activity',
      key: byPair.has(pair) ? pair : (soleBucket.get(id) ?? pair),
    }
  }
}

export function scheduledDays(
  entries: Iterable<ChargeableEntry>,
  activityBuckets: BucketDraft[],
): ScheduledDays {
  const activity = new Map<string, number>()
  const distributor = new Map<string, number>()
  const activityDates = new Map<string, Set<string>>()
  const distributorDates = new Map<string, Set<string>>()

  const chargedTo = chargeResolver(activityBuckets)

  for (const entry of entries) {
    const charge = chargedTo(entry)
    if (!charge) continue

    if (charge.side === 'distributor') {
      bump(distributor, charge.key)
      if (entry.date) hold(distributorDates, charge.key, entry.date)
      continue
    }

    bump(activity, charge.key)
    if (entry.date) hold(activityDates, charge.key, entry.date)
  }

  return { activity, distributor, activityDates, distributorDates }
}
