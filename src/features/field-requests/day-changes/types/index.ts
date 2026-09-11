/**
 * Where a day-change request stands. `cancelled` is the rep withdrawing it
 * from the app — it never appears as an answer the admin gave.
 */
export type DayChangeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

/**
 * The decision being asked for.
 *
 * `update` — the proposed entries REPLACE the date's work. Approving drops what
 * the rep was allocated for that day (anything not already visited against) and
 * puts these in its place.
 *
 * `create` — the proposed entries are ADDED. Nothing already on the date is
 * touched; the rep is filling time he has left.
 */
export type DayChangeOperation = 'update' | 'create'

/**
 * A beat on a day-change entry. Id and name arrive together, so the name is
 * never mis-paired; it is null when the beat has since been removed and the
 * id is what the UI falls back to.
 */
export interface DayChangeBeat {
  id: number
  name: string | null
}

/** A distributor a VISIT entry would call on. */
export interface DayChangeVisitDistributor {
  id: number
  name: string | null
}

/** One piece of work the rep is proposing for the date. */
export interface DayChangeEntry {
  id: number
  /** The order he intends to work them. */
  sequence: number
  activityId: number
  activityName: string | null
  distributorId: number | null
  distributorName: string | null
  /** Re-derived from the beats at approval time; carried here for display. */
  cityId: number | null
  beats: DayChangeBeat[]
  /** Whom a VISIT entry would call on. Empty on everything else. */
  visitDistributors: DayChangeVisitDistributor[]
  jointWorkingSalesInchargeId: number | null
  /** The note that would travel onto the scheduled row — not the review reason. */
  reason: string | null
}

/**
 * One piece of work ALREADY on the date — what approving would cost.
 *
 * The flags are the server's own verdict, not ours to re-derive: visited or
 * admin-fixed work is kept whichever way the request is answered, and
 * `willBeReplaced` marks exactly the rows an approval drops.
 */
export interface DayChangeCurrentEntry extends DayChangeEntry {
  fixedByAdmin: boolean
  visited: boolean
  willBeReplaced: boolean
}

/**
 * One day-change request as the queue shows it.
 *
 * NOTHING HAS BEEN WRITTEN TO THE PLAN while this is `pending`: the rep's app,
 * his beats and every counter still show the day the admin allocated. Approving
 * is the only thing that changes that.
 */
export interface DayChange {
  id: number
  journeyPlanId: number
  /** The day row for the date, or null when the date carries nothing yet. */
  journeyPlanDayId: number | null
  /** `yyyy-MM-dd` — the date being re-planned. */
  date: string
  operation: DayChangeOperation
  /** Why the rep is asking, in his own words. A person reads this. */
  reason: string
  status: DayChangeStatus
  /** The proposed work, in sequence order. */
  entries: DayChangeEntry[]
  /** What the date already holds, in sequence order. Empty when it holds nothing. */
  currentEntries: DayChangeCurrentEntry[]
  requestedAt: string
  reviewedAt: string | null
  /** Why the admin said no. Set only while `rejected`. */
  rejectionReason: string | null
  /**
   * True once a visit has landed on the date. NOT a refusal — the request
   * exists for the day already being worked, and this is what protects the
   * entries already visited against from being replaced.
   */
  dayLocked: boolean
  salesInchargeId: number
  /** Null if the rep has since been removed. */
  salesInchargeName: string | null
}

/**
 * Query params accepted by the day-change list endpoint (camelCase). Mirrors
 * the documented set exactly — there is no free-text search, and `sortOrder`
 * has no companion `sort_by`: the queue is always ordered by request time.
 */
export interface DayChangeListParams {
  page?: number
  pageSize?: number
  /** Omitted means `pending` — the endpoint's own default. */
  status?: DayChangeStatus
  /** Narrow to replacements (`update`) or additions (`create`). */
  operation?: DayChangeOperation
  salesInchargeId?: number
  /** Bounds the DATE BEING RE-PLANNED, not when the request was made. */
  fromDate?: string
  toDate?: string
  sortOrder?: 'asc' | 'desc'
}

/** Normalised day-change list result: a page of rows + pagination. */
export interface DayChangeListResult {
  items: DayChange[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * The review answer. Approving carries nothing else; rejecting REQUIRES a
 * reason, which the rep reads back in the app — the union makes the pair
 * unrepresentable the wrong way round.
 */
export type DayChangeReview =
  | { status: 'approved' }
  | { status: 'rejected'; rejectionReason: string }

/** What an approval did to the date. */
export interface DayChangeApplied {
  /** The day the entries landed on — created by the approval if there was none. */
  journeyPlanDayId: number
  /** Entries dropped from the date. Always 0 on a `create`. */
  entriesRemoved: number
  /** Entries written. */
  entriesAdded: number
  /**
   * Entries left alone because a visit had already landed on them. On an
   * `update` this is the part of the day that is history.
   */
  entriesKept: number
}

/**
 * What the review PATCH answers with: the request as it now stands, plus what
 * the approval wrote. `applied` is null on a rejection — nothing moved.
 */
export interface DayChangeReviewResult {
  dayChange: DayChange
  applied: DayChangeApplied | null
}
