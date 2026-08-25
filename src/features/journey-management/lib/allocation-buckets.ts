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
  daysCount: number
}

/**
 * The identity of a bucket. **Never key on `id` alone** — a React key, a lookup
 * map or an equality check that does will fold two cities' worth of the same
 * activity into one, and an edit to either will overwrite the other.
 */
export function bucketKey(bucket: BucketDraft): string {
  return `${bucket.id}|${bucket.cityId ?? ''}`
}
