/**
 * Lifecycle status. The only two values the API stores or accepts — approval
 * state lives on `onboardingStatus`, not here.
 */
export type RetailerStatus = 'active' | 'inactive'
/** Statuses PATCH …/retailers/{id}/status accepts — the same two. */
export type RetailerLifecycleStatus = RetailerStatus
/** Onboarding-approval workflow state, independent of the lifecycle status. */
export type RetailerOnboardingStatus = 'pending' | 'approved' | 'rejected'
/** Action accepted by PATCH …/retailers/{id}/onboarding. */
export type RetailerOnboardingAction = 'approve' | 'reject'

/**
 * One owner/partner of an outlet. An outlet can have several (the API's
 * `owners[]`, 1–20 entries) and the whole list is replaced on every save. Each
 * owner carries their own alternate number — a second line for that person.
 */
export interface RetailerOwner {
  name: string
  mobile: string
  alternateMobile?: string
  birthDate?: string
  anniversaryDate?: string
}

/**
 * A distributor serving the outlet's beat. Derived from the beat rather than
 * linked directly, so an outlet can have several (primary first) or none.
 */
export interface RetailerDistributor {
  id: string
  name: string
}

/**
 * A retailer as shown in the list. The list endpoint returns the full record,
 * so every owner and distributor is available here without a second fetch.
 */
export interface Retailer {
  id: string
  code: string
  shopName: string
  /** Every owner/partner of the outlet, oldest first (may be empty). */
  owners: RetailerOwner[]
  status: RetailerStatus
  onboardingStatus: RetailerOnboardingStatus
  /** Free-text market / trade area the outlet sits in. */
  market?: string
  cityId: string
  /** City display name resolved by the list endpoint (`city_name`). */
  cityName?: string
  /** Auto-assigned: the beat closest to the outlet. */
  beatId: string
  /** Beat display name resolved by the list endpoint (`beat_name`). */
  beatName?: string
  /** Firms serving the outlet's beat, primary first — derived, not linked. */
  distributors: RetailerDistributor[]
  /** Outlet-type name resolved by the list endpoint (`outlet_type_name`). */
  outletTypeName?: string
}

/**
 * Payload the create form produces: camelCase scalar fields plus the raw picked
 * `File`s for the shop photo. On submit the files are presigned + uploaded and
 * replaced with their storage keys before the create request is sent.
 *
 * Deliberately has no `status` (the create/update bodies reject it — use
 * PATCH …/status) and no `beatId` (the beat, and through it the distributor, is
 * derived server-side from the captured coordinates).
 */
export interface RetailerCreateInput {
  // --- Shop & owner ---
  code?: string
  shopName: string
  /**
   * Every owner/partner of the outlet — sent complete as `owners[]`, since the
   * API replaces the whole list on each save (an owner left out is removed).
   * At least one entry, at most 20 — each with its own alternate number.
   */
  owners: RetailerOwner[]

  // --- Address / geography ---
  addressLine?: string
  address?: string
  /** Reverse-geocoded address for the captured lat/lng — derived, not typed. */
  formattedAddress?: string
  landmark?: string
  market?: string
  stateId: string
  zoneId: string
  districtId: string
  talukaId: string
  cityId: string
  pincode?: string

  // --- Geo-location, captured as a single "lat, lng" string by the picker ---
  latitude?: string
  longitude?: string

  // --- Classification ---
  outletTypeId?: string

  // --- Photo (a single shop-front image) ---
  shopPhoto?: File[]
}

/**
 * Storage keys already persisted on a record. On update these are kept as-is
 * and merged with any newly-uploaded files, so editing a retailer without
 * re-picking the shop photo doesn't wipe it.
 */
export interface RetailerExistingFiles {
  shopPhotoPath: string
}

/**
 * Payload the edit form produces: the same shape as create plus the record id
 * and the paths already saved, so newly-picked files can be appended rather
 * than replacing what's there.
 */
export interface RetailerUpdateInput extends RetailerCreateInput {
  id: string
  existing: RetailerExistingFiles
}

/**
 * Display-oriented view of a single retailer — the full detail record mapped to
 * camelCase with the photo path resolved to a full media URL. Powers the
 * read-only "view details" modal on the list screen.
 */
export interface RetailerDetailView {
  id: string
  code: string | null
  status: RetailerStatus
  onboardingStatus: RetailerOnboardingStatus

  // --- Shop & owner ---
  shopName: string
  /** Owners/partners of the outlet, oldest first. */
  owners: RetailerOwner[]

  // --- Address / geography ---
  addressLine: string | null
  address: string | null
  formattedAddress: string | null
  landmark: string | null
  market: string | null
  stateName: string | null
  zoneName: string | null
  districtName: string | null
  talukaName: string | null
  cityName: string | null
  pincode: string | null
  /** Auto-assigned beat, and the firms serving it (primary first, may be empty). */
  beatName: string | null
  distributors: RetailerDistributor[]

  /** "lat, lng" assembled from the two stored columns (null when unset). */
  geoLocation: string | null

  // --- Classification & photo ---
  outletTypeName: string | null
  shopPhotoUrl: string

  // --- Field activity ---
  lastOrderAt: string | null
  lastVisitAt: string | null
  visitCount: number | null
}

// --- Live list API (GET /sales-incharge-admin/retailers) --------------------

/**
 * Columns the list endpoint can sort by (its documented `sort_by` enum). Owner
 * name/mobile are deliberately absent — an outlet can have several owners, so
 * there's no single value to order on.
 */
export type RetailerSortBy =
  | 'shop_name'
  | 'city_id'
  | 'status'
  | 'created_at'
  | 'updated_at'

/** Query params accepted by the list endpoint. Forwarded verbatim as snake_case. */
export interface RetailerListParams {
  /** 1-based page number. Default 1. */
  page?: number
  /** Rows per page (1–100). Default 20. */
  pageSize?: number
  /**
   * Case-insensitive match against the shop name, the retailer code, or ANY
   * owner's name / mobile / e-mail.
   */
  search?: string
  /** Filter by lifecycle status. */
  status?: RetailerStatus
  /** Filter by onboarding-approval state (e.g. `pending` for the approval queue). */
  onboardingStatus?: RetailerOnboardingStatus
  /** Filter by outlet type. */
  outletTypeId?: string
  /** Filter by beat. */
  beatId?: string
  /** Geography filters. */
  stateId?: string
  districtId?: string
  talukaId?: string
  cityId?: string
  /** Keep only outlets whose beat belongs to this distributor. */
  distributorId?: string
  /** Column to sort by. Defaults to newest first when omitted. */
  sortBy?: RetailerSortBy
  /** Sort direction. Defaults to `desc`. */
  sortOrder?: 'asc' | 'desc'
}

/** Normalised list result: a page of rows plus its pagination metadata. */
export interface RetailerListResult {
  items: Retailer[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
