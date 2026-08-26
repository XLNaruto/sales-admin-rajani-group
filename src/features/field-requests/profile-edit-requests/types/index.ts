/**
 * Where a profile edit request stands. There is deliberately no on-hold state:
 * a rep may hold only one open request at a time, so a request nobody has
 * answered and nobody can replace is a dead end for the man in the field.
 */
export type ProfileEditRequestStatus = 'pending' | 'approved' | 'rejected'

/**
 * One profile edit request. The list row and the GET-by-id carry the same
 * fields — the rep, how to reach him, and his ask in his own words — which is
 * what lets the queue be answered without opening the Sales Incharge Master.
 */
export interface ProfileEditRequest {
  id: number
  /** What the rep asked for, in his own words. */
  message: string
  status: ProfileEditRequestStatus
  requestedAt: string
  /** Null while pending. */
  reviewedAt: string | null
  /**
   * The admin's note. Always present on a rejection — it is the reason the rep
   * acts on — and optional on an approval.
   */
  reviewReason: string | null
  salesInchargeId: number
  /** Null if the rep has since been removed. */
  salesInchargeName: string | null
  salesInchargePhone: string | null
  employeeCode: string | null
}

/**
 * Query params accepted by the profile-edit-request list endpoint (camelCase).
 * Mirrors the documented set exactly — `sortOrder` has no companion `sort_by`:
 * the queue is always ordered by when the request was raised.
 */
export interface ProfileEditRequestListParams {
  page?: number
  pageSize?: number
  /** Omitted means `pending` — the endpoint's own default. */
  status?: ProfileEditRequestStatus
  salesInchargeId?: number
  search?: string
  sortOrder?: 'asc' | 'desc'
}

/** Normalised profile-edit-request list result: a page of rows + pagination. */
export interface ProfileEditRequestListResult {
  items: ProfileEditRequest[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * The review answer. A rejection REQUIRES a reason — the rep reads it back in
 * the app, so a bare refusal leaves him nothing to act on. An approval may
 * carry one too ("done, corrected on the 3rd"), but need not.
 */
export type ProfileEditReview =
  | { status: 'approved'; reason?: string }
  | { status: 'rejected'; reason: string }
