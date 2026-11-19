/** Where a face request stands. Answered exactly once: pending → approved | rejected. */
export type FaceRequestStatus = 'pending' | 'approved' | 'rejected'

/**
 * `add` registers a rep's first face; `edit` re-captures an existing one. The
 * live face keeps working until an `edit` is approved.
 */
export type FaceRequestType = 'add' | 'edit'

/**
 * One face request — the same shape on the list row, the GET-by-id read and the
 * review response.
 *
 * Image buckets are three-state on an `edit`: `null` means the rep did not
 * re-send that bucket (it stays as it is), `[]` means he asked to clear it, and
 * a list is the new set of keys. On an `add` both are whatever was captured.
 */
export interface FaceRequest {
  id: number
  salesInchargeId: number
  type: FaceRequestType
  status: FaceRequestStatus
  rejectReason: string | null
  reviewedAt: string | null
  /** Id of the admin who answered it; null while pending. */
  reviewedBy: number | null
  createdAt: string
  salesInchargeName: string | null
  salesInchargePhone: string | null
  employeeCode: string | null
  /** S3 keys of the primary capture (see the three-state note above). */
  images: string[] | null
  /** S3 keys of the secondary capture. */
  secondaryImages: string[] | null
  device: string | null
  os: string | null
  model: string | null
  appVersion: string | null
}

/** One stored face image — a real id and its S3 key. */
export interface FaceImage {
  id: number | null
  key: string
}

/** The rep's live, approved face — what attendance matches against today. */
export interface CurrentFace {
  id: number
  salesInchargeId: number
  device: string | null
  os: string | null
  model: string | null
  appVersion: string | null
  updatedDevice: string | null
  updatedOs: string | null
  updatedModel: string | null
  updatedAppVersion: string | null
  poseImages: FaceImage[]
  secondaryImages: FaceImage[]
  createdAt: string | null
  updatedAt: string | null
}

/** GET /face-requests/{id}: the request plus the live face to compare it with. */
export interface FaceRequestDetail extends FaceRequest {
  /** Null when the rep has no face yet — always so for an `add`. */
  currentFace: CurrentFace | null
}

/** Query params accepted by the face-request list endpoint (camelCase). */
export interface FaceRequestListParams {
  page?: number
  pageSize?: number
  /** Omitted means `pending` — the endpoint's own default. */
  status?: FaceRequestStatus
  type?: FaceRequestType
  salesInchargeId?: number
  search?: string
  sortOrder?: 'asc' | 'desc'
}

/** Normalised face-request list result: a page of rows + pagination. */
export interface FaceRequestListResult {
  items: FaceRequest[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** The review answer. A rejection REQUIRES a reason — the rep reads it in the app. */
export type FaceRequestReview =
  | { status: 'approved' }
  | { status: 'rejected'; rejectReason: string }
