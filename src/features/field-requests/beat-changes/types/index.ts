/**
 * Where a beat-change request stands. `cancelled` is the rep withdrawing it
 * from the app — it never appears as an answer the admin gave.
 */
export type BeatChangeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

/**
 * One beat-change request as the queue shows it.
 *
 * A row names the day being changed, the beat coming off, the beat going on and
 * the rep's own reason — deliberately enough to answer without opening the plan.
 */
export interface BeatChange {
  id: number
  journeyPlanId: number
  journeyPlanDayId: number
  /**
   * The plan ENTRY whose beat list is changing. A date may carry several pieces
   * of work, so the date alone does not identify which one.
   */
  journeyPlanDayActivityId: number
  /** `yyyy-MM-dd` — the day being changed. */
  planDate: string
  activityId: number
  /** The entry's distributor. BOTH beats must serve it. */
  distributorId: number | null
  /** The entry's city, for display. */
  cityId: number | null
  fromBeatId: number
  fromBeatName: string | null
  toBeatId: number
  toBeatName: string | null
  /** Why the rep is asking, in his own words. */
  reason: string
  status: BeatChangeStatus
  requestedAt: string
  reviewedAt: string | null
  /** Why the admin said no. Set only while `rejected`. */
  rejectionReason: string | null
  /**
   * True once a visit has landed on the day. A locked day can no longer be
   * changed, so a pending request against one will be refused at review — the
   * queue flags it up front rather than letting the admin discover it on click.
   */
  dayLocked: boolean
  salesInchargeId: number
  /** Null if the rep has since been removed. */
  salesInchargeName: string | null
}

/**
 * Query params accepted by the beat-change list endpoint (camelCase). Mirrors
 * the documented set exactly — there is no free-text search here, and
 * `sortOrder` has no companion `sort_by`: the queue is always ordered by when
 * the request was raised.
 */
export interface BeatChangeListParams {
  page?: number
  pageSize?: number
  /** Omitted means `pending` — the endpoint's own default. */
  status?: BeatChangeStatus
  salesInchargeId?: number
  /** Bounds the DAY BEING CHANGED, not when the request was made. */
  fromDate?: string
  toDate?: string
  sortOrder?: 'asc' | 'desc'
}

/** Normalised beat-change list result: a page of rows + pagination. */
export interface BeatChangeListResult {
  items: BeatChange[]
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
export type BeatChangeReview =
  | { status: 'approved' }
  | { status: 'rejected'; rejectionReason: string }

/**
 * What the review PATCH answers with: the request as it now stands, plus the
 * entry's beats in sequence order — on approval the replacement has already
 * taken the outgoing beat's place in the walk.
 */
export interface BeatChangeReviewResult {
  beatChange: BeatChange
  dayBeatIds: number[]
}
