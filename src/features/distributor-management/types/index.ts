export type DistributorStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'rejected'
/**
 * Lifecycle statuses the API accepts on PATCH …/distributors/{id}/status.
 * (`pending`/`rejected` are UI-only workflow states, not settable via the API.)
 */
export type DistributorLifecycleStatus = 'active' | 'inactive' | 'suspended'
/** Onboarding-approval workflow state, independent of the lifecycle status. */
export type DistributorOnboardingStatus = 'pending' | 'approved' | 'rejected'
/** Action accepted by PATCH …/distributors/{id}/onboarding. */
export type DistributorOnboardingAction = 'approve' | 'reject'
export type FirmType = 'proprietorship' | 'partnership' | 'company'
export type YesNo = 'yes' | 'no'
export type DistributorMarketType = 'local' | 'rural' | 'local_rural' | 'counter_sales'
export type MarketSystem = 'ready_stock' | 'booking'
/** Weekday a distributor is served on its delivery route (the API's enum). */
export type DeliveryRouteDay =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
/**
 * The payment terms a distributor trades on: the id of a row in the
 * payment-condition master (`@/features/master-management`). Not an enum — the
 * master is maintained by the user, so ids are all the app can rely on.
 */
export type PaymentConditionId = number

/**
 * One owner/partner of a distributor firm. A firm has at least one and at most
 * 20 (see the `owners` array on POST/PATCH /distributors); the whole list is
 * replaced on every save. Dates are 'yyyy-MM-dd' strings.
 */
export interface DistributorOwner {
  name: string
  mobile: string
  email?: string
  birthDate?: string
  anniversaryDate?: string
}

export interface Distributor {
  id: string

  // --- Firm & owner details ---
  firmName: string
  firmType: FirmType
  /** Owners/partners of the firm, oldest first (`owners`). */
  owners: DistributorOwner[]
  communicationMobile?: string
  multipleLogin?: YesNo
  email: string
  code: string
  status: DistributorStatus
  onboardingStatus: DistributorOnboardingStatus
  /** Company (tenant) ids the distributor is attached to (`company_id`). */
  companyIds?: string[]
  /** Company names resolved by the list endpoint (`company_names`). */
  companyNames?: string[]

  // --- Location & coverage ---
  officeAddress: string
  godownAddress?: string
  homeAddress?: string
  stateId: string
  zoneId: string
  districtId: string
  talukaId: string
  cityId: string
  /** City display name resolved by the list endpoint (`city_name`). */
  cityName?: string
  pincode?: string
  /** Id of a row in the route master (`delivery_route_id`). */
  deliveryRouteId?: number
  /** Weekday served on that route. */
  deliveryRouteDay?: DeliveryRouteDay
  agencyTalukaIds?: string[]
  marketType?: DistributorMarketType
  villageIds?: string[]
  retailersLocal?: number
  retailersRural?: number
  marketSystem?: MarketSystem
  weeklyOff?: string
  geoLocation?: string
  officeImagePaths?: string[]
  godownImagePaths?: string[]

  // --- Business details ---
  otherAgencies?: string
  similarAgencies?: string
  assignedProducts?: string
  productTargets?: string
  deliveryVehicle?: YesNo
  deliveryVehicleDetail?: string
  godownSize?: number
  yearOfEst?: string

  // --- Legal & financial ---
  panNumber?: string
  panPhotoPath?: string
  gstNumber?: string
  gstPhotoPath?: string
  advanceChequeNumbers?: string
  advanceChequePhotoPath?: string
  paymentConditionId?: PaymentConditionId
  bankAccountName?: string
  bankAccountNumber?: string
  bankIfsc?: string
  bankName?: string
}

export type DistributorInput = Omit<Distributor, 'id'>

/**
 * Payload the create form produces: camelCase scalar fields plus the raw picked
 * `File`s for each image category. On submit the files are presigned + uploaded
 * and replaced with their storage keys before the create request is sent.
 */
export interface DistributorCreateInput {
  // --- Firm & owner ---
  firmName: string
  firmType: FirmType
  /** At least one owner/partner; sent as the complete `owners` list. */
  owners: DistributorOwner[]
  communicationMobile?: string
  multipleLogin?: YesNo
  email: string
  status: DistributorStatus
  /**
   * Selected company (tenant) ids — a distributor can belong to several. Held
   * as strings by the form; sent to the API as the numeric `company_id` array.
   */
  companyIds?: string[]

  // --- Location & coverage ---
  officeAddress: string
  godownAddress?: string
  homeAddress?: string
  stateId: string
  zoneId: string
  districtId: string
  talukaId: string
  cityId: string
  pincode?: string
  /** Id of a row in the route master; sent as `delivery_route_id`. */
  deliveryRouteId?: number
  /** Weekday served on that route; sent as `delivery_route_day`. */
  deliveryRouteDay?: DeliveryRouteDay
  agencyTalukaIds?: string[]
  marketType?: DistributorMarketType
  villageIds?: string[]
  retailersLocal?: number
  retailersRural?: number
  marketSystem?: MarketSystem
  weeklyOff?: string
  geoLocation?: string
  officeImages?: File[]
  godownImages?: File[]

  // --- Business details ---
  otherAgencies?: string
  similarAgencies?: string
  assignedProducts?: string
  productTargets?: string
  deliveryVehicle?: YesNo
  deliveryVehicleDetail?: string
  godownSize?: number
  yearOfEst?: string

  // --- Legal & financial ---
  panNumber?: string
  panPhoto?: File[]
  gstNumber?: string
  gstPhoto?: File[]
  advanceChequeNumbers?: string
  advanceChequePhoto?: File[]
  paymentConditionId?: PaymentConditionId
  bankAccountName?: string
  bankAccountNumber?: string
  bankIfsc?: string
  bankName?: string
}

/**
 * Storage keys/paths already persisted on a record. On update these are kept
 * as-is and merged with any newly-uploaded files, so editing a distributor
 * without re-picking images doesn't wipe the existing ones.
 */
export interface DistributorExistingFiles {
  officeImagePaths: string[]
  godownImagePaths: string[]
  panCardPhotoPath: string
  gstPhotoPath: string
  advanceChequePhotoPath: string
}

/**
 * Payload the edit form produces: the same shape as create plus the record id
 * and the paths already saved, so newly-picked files can be appended rather
 * than replacing what's there.
 */
export interface DistributorUpdateInput extends DistributorCreateInput {
  id: string
  existing: DistributorExistingFiles
}

/**
 * Display-oriented view of a single distributor — the full detail record mapped
 * to camelCase with image paths resolved to full media URLs. Powers the
 * read-only "view details" modal on the list screen. Reference ids (state/city/
 * taluka) stay as strings; the modal resolves them to names via the reference
 * lib.
 */
export interface DistributorDetailView {
  id: string
  code: string | null
  status: DistributorStatus

  // --- Firm & owner ---
  firmName: string
  firmType: FirmType | null
  legalName: string | null
  /** Owners/partners on the record — empty for pre-migration distributors. */
  owners: DistributorOwner[]
  communicationMobile: string | null
  multipleLogin: boolean | null
  email: string | null
  /** Names of the companies (tenants) this distributor is attached to. */
  companyNames: string[]

  // --- Location & coverage ---
  officeAddress: string | null
  godownAddress: string | null
  homeAddress: string | null
  stateId: string | null
  stateName: string | null
  zoneName: string | null
  districtName: string | null
  cityId: string | null
  cityName: string | null
  talukaId: string | null
  talukaName: string | null
  pincode: string | null
  deliveryRouteId: number | null
  /** Route display name resolved by the API (`delivery_route_name`). */
  deliveryRoute: string | null
  deliveryRouteDay: string | null
  marketType: string | null
  marketSystem: string | null
  weeklyOff: string | null
  geoLocation: string | null
  retailersLocal: number | null
  retailersRural: number | null
  officeImageUrls: string[]
  godownImageUrls: string[]

  // --- Business details ---
  otherAgencies: string | null
  similarAgencies: string | null
  assignedProducts: string | null
  productTargets: string | null
  deliveryVehicle: boolean | null
  deliveryVehicleDetail: string | null
  godownSize: number | null
  yearOfEst: number | null

  // --- Legal & financial ---
  panNumber: string | null
  panPhotoUrl: string
  gstNumber: string | null
  gstPhotoUrl: string
  advanceChequeNumbers: string | null
  advanceChequePhotoUrl: string
  paymentConditionId: number | null
  /** Master name resolved by the API — what the detail view shows. */
  paymentCondition: string | null
  bankAccountName: string | null
  bankAccountNumber: string | null
  bankIfsc: string | null
  bankName: string | null
}

// --- Live list API (GET /sales-incharge-admin/distributors) -----------------

/**
 * Columns the list endpoint can sort by. Owner columns aren't sortable — owners
 * live in a child table now, so the API dropped them from `sort_by`.
 */
export type DistributorSortBy = 'firm_name' | 'email' | 'city_id' | 'status'

/** Query params accepted by the list endpoint. Forwarded verbatim as snake_case. */
export interface DistributorListParams {
  /** 1-based page number. Default 1. */
  page?: number
  /** Rows per page (1–100). Default 20. */
  pageSize?: number
  /** Case-insensitive match against firm/owner name, phone, email or code. */
  search?: string
  /** Filter by status. */
  status?: string
  /** Filter by distributor (firm) type, exact match. */
  firmType?: string
  /** Column to sort by. Defaults to newest first when omitted. */
  sortBy?: DistributorSortBy
  /** Sort direction. */
  sortOrder?: 'asc' | 'desc'
}

/** Normalised list result: a page of rows plus its pagination metadata. */
export interface DistributorListResult {
  items: Distributor[]
  /** Total rows across all pages. */
  total: number
  /** Current page (1-based). */
  page: number
  /** Rows per page. */
  pageSize: number
  /** Total number of pages. */
  totalPages: number
}


/**
 * One row from the distributor-options endpoint: just enough to render a
 * dropdown entry and submit its value.
 */
export interface DistributorOption {
  id: string
  name: string
}

/** Query params accepted by the distributor-options endpoint (camelCase). */
export interface DistributorOptionsParams {
  page?: number
  pageSize?: number
  search?: string
  /**
   * Restrict the picker to one lifecycle status. Omitted means no filter — but
   * a form that assigns new work should pass `active`, so a suspended or closed
   * firm can't be picked up as a fresh commitment.
   */
  status?: DistributorLifecycleStatus
}

/** One page of distributor options plus its pagination metadata. */
export interface DistributorOptionsResult {
  items: DistributorOption[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
