/** Where a retailer edit request stands. Answered exactly once: pending → approved | rejected. */
export type RetailerEditRequestStatus = 'pending' | 'approved' | 'rejected'

/** One owner / partner of an outlet. */
export interface RetailerEditOwner {
  name: string | null
  mobile: string
  alternateMobile: string | null
  birthDate: string | null
  marriageAnniversary: string | null
}

/**
 * The outlet fields an edit request can change — shared by the proposed
 * `payload` and the outlet as it is now, so the two line up field by field.
 *
 * The payload is a FULL replace: a field the rep left out is cleared on
 * approval. The one exception is `beatId`, which is `undefined` when the key
 * was left out (the beat stays), `null` to unassign, or an id to move.
 */
export interface RetailerEditFields {
  shopName: string | null
  owners: RetailerEditOwner[]
  addressLine: string | null
  address: string | null
  formattedAddress: string | null
  landmark: string | null
  market: string | null
  stateId: number | null
  zoneId: number | null
  districtId: number | null
  talukaId: number | null
  cityId: number | null
  pincode: string | null
  latitude: string | null
  longitude: string | null
  outletTypeId: number | null
  beatId: number | null | undefined
  shopPhotoPath: string | null
}

/**
 * One retailer edit request — the same shape on the list row, the GET-by-id
 * read and the review response. `shopName` / `retailerCode` are the outlet's
 * CURRENT values; `payload` holds the proposed ones.
 */
export interface RetailerEditRequest {
  id: number
  retailerId: number
  shopName: string | null
  retailerCode: string | null
  salesInchargeId: number | null
  salesInchargeName: string | null
  salesInchargePhone: string | null
  employeeCode: string | null
  payload: RetailerEditFields
  status: RetailerEditRequestStatus
  reviewedAt: string | null
  /** Always set on a rejection; optional on an approval. */
  reviewReason: string | null
  createdAt: string
  updatedAt: string | null
}

/** The outlet as it stands now, for the old-vs-new comparison. */
export interface CurrentRetailer extends RetailerEditFields {
  id: number
  retailerCode: string | null
  onboardingStatus: string | null
  status: string | null
}

/** GET /retailer-edit-requests/{id}: the request plus the outlet to compare it with. */
export interface RetailerEditRequestDetail extends RetailerEditRequest {
  /** Null when the outlet has since been deleted. */
  currentRetailer: CurrentRetailer | null
}

/** Query params accepted by the retailer-edit-request list endpoint (camelCase). */
export interface RetailerEditRequestListParams {
  page?: number
  pageSize?: number
  /** Omitted means `pending` — the endpoint's own default. */
  status?: RetailerEditRequestStatus
  salesInchargeId?: number
  retailerId?: number
  search?: string
  sortOrder?: 'asc' | 'desc'
}

/** Normalised list result: a page of rows + pagination. */
export interface RetailerEditRequestListResult {
  items: RetailerEditRequest[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** The review answer. A rejection REQUIRES a reason — the rep reads it in the app. */
export type RetailerEditReview =
  | { status: 'approved'; reason?: string }
  | { status: 'rejected'; reason: string }
