/**
 * Domain types for Location Tracking — the GPS breadcrumb ledger.
 *
 * Coordinates stay **strings** everywhere in app state. The column is
 * `numeric(9,6)` and the values travel as strings so no precision is lost in
 * JSON; they become numbers only at the map's drawing boundary (see
 * `lib/location-format.ts`), never in a type that is stored or sent back.
 */

/** Account status of a rep — the `status` filter's vocabulary. */
export type RepStatus = 'active' | 'invited' | 'suspended' | 'inactive'

/** Sort columns the live endpoint accepts. */
export type FleetSortBy = 'display_name' | 'employee_code' | 'status'

export type SortOrder = 'asc' | 'desc'

/**
 * One rep and their most recent fix on the tracked day.
 *
 * A rep who has not reported is **still a row**: every coordinate is `null`,
 * `lastSeenMinutesAgo` is `null` and `isStale` is `true`. That row is the single
 * most important thing the screen says, so it is never filtered out client-side.
 */
export interface FleetFix {
  salesInchargeId: string
  salesInchargeName: string
  employeeCode: string | null
  status: RepStatus
  /** Latitude as sent, e.g. `"21.524167"`. Null when nothing was reported. */
  latitude: string | null
  /** Longitude as sent. Null when nothing was reported. */
  longitude: string | null
  /** Beat the latest fix was tagged with — null while travelling, or if deleted. */
  beatId: string | null
  beatName: string | null
  /** The LATEST fix's own mock-location report, stored as sent. */
  isFakeLocation: boolean
  /**
   * Whether ANY fix on the tracked day carried the mock flag — server-computed
   * over the whole day, so a rep who spoofed at noon and reported honestly at
   * 6pm is still flagged. `isFakeLocation` alone would have lost that.
   */
  hasFakeLocation: boolean
  /** How many of the day's fixes carried the flag. Zero when none did. */
  fakeLocationCount: number
  /** ISO-8601 instant of the fix, or null when there is none. */
  recordedAt: string | null
  /** Server-stamped, FLOORED minutes since the fix. Null when there is none. */
  lastSeenMinutesAgo: number | null
  /** True past 15 minutes — and always true when there is no fix at all. */
  isStale: boolean
  /** Derived: the row carries a drawable coordinate pair. */
  hasFix: boolean
}

/** How a row reads on the map and in the list. */
export type FixState = 'fresh' | 'stale' | 'no-signal'

/** One page of the fleet, plus the envelope every list on this panel returns. */
export interface FleetResult {
  items: FleetFix[]
  /** Counts REPS, not fixes — the denominator is the whole team. */
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Query params for `GET /locations/live` (camelCase; mapped in `api/`). */
export interface FleetParams {
  page?: number
  pageSize?: number
  /** IST calendar day as `yyyy-MM-dd`. Defaults server-side to today. */
  trackedDate?: string
  /** Matches display name or phone, case-insensitive. */
  search?: string
  status?: RepStatus
  /** Keeps reps whose LATEST fix carries this beat. */
  beatId?: string
  onlyStale?: boolean
  onlyFake?: boolean
  sortBy?: FleetSortBy
  sortOrder?: SortOrder
}

/** One recorded position on a rep's day. */
export interface TrailPoint {
  id: string
  latitude: string
  longitude: string
  beatId: string | null
  /** Null is normal — travelling, or outside any beat. Not an error. */
  beatName: string | null
  isFakeLocation: boolean
  recordedAt: string
}

/** One rep's whole day of fixes. Never paginated — a half-drawn route is wrong. */
export interface RepTrail {
  salesInchargeId: string
  salesInchargeName: string
  /** The IST calendar day, as `yyyy-MM-dd`. */
  trackedDate: string
  /** Already oldest-first — the order the polyline is drawn in. Never re-sorted. */
  points: TrailPoint[]
  totalPoints: number
  /**
   * Summed straight-line hops between consecutive fixes — **not road distance**.
   * Zero for fewer than two points: one fix is a place, not a journey.
   */
  distanceMetres: number
  /** Points carrying the device's mock-location flag. */
  mockSuspectedCount: number
  firstSeenAt: string | null
  lastSeenAt: string | null
}

/** A coordinate pair as the map SDK needs it — numbers, at the render boundary only. */
export interface MapPoint {
  lat: number
  lng: number
}
