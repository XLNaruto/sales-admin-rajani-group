/**
 * The shape of a draft allocation bucket, and its identity.
 *
 * Split out of the editor component so the hook and the editor agree on what a
 * bucket *is* without either importing the other's rendering.
 */

/**
 * A bucket in the draft: which thing, and how many days of the month it takes.
 *
 * On the activity side `cityId` is **part of the identity**, not a property —
 * "two days of distributor search in Rajkot" and "two in Morbi" are two buckets,
 * and matching one on `id` alone silently merges them. On the distributor side it
 * is always absent, because a distributor bucket has no city axis.
 */
export interface BucketDraft {
  /** Activity id, or distributor id — the panel decides which. */
  id: string
  /** Only meaningful on an activity bucket; absent means "anywhere". */
  cityId?: string | null
  /**
   * Distributors named on a **distributor-visit** activity bucket. A set the
   * bucket carries, NOT part of its identity the way `cityId` is: adding a
   * distributor edits this bucket rather than splitting it into two.
   */
  distributorIds?: string[]
  /**
   * Dates the admin PINNED on this bucket, `yyyy-MM-dd` — optional, and capped
   * at `daysCount`. Empty is the ordinary case: the dates are his to pick.
   */
  dates?: string[]
  daysCount: number
}

/** Same set of ids (or dates) on a bucket, order disregarded. */
export function sameIdSet(a?: string[] | null, b?: string[] | null): boolean {
  const left = [...(a ?? [])].sort()
  const right = [...(b ?? [])].sort()
  return left.length === right.length && left.every((id, i) => id === right[i])
}

/**
 * The identity of a bucket. **Never key on `id` alone** — a React key, a lookup
 * map or an equality check that does will fold two cities' worth of the same
 * activity into one, and an edit to either will overwrite the other.
 */
export function bucketKey(bucket: BucketDraft): string {
  return `${bucket.id}|${bucket.cityId ?? ''}`
}
