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
export type PaymentCondition = 'same_day_cheque' | 'due_date_neft_rtgs' | 'advance'

/** A product-division master option (id + display name). */
export interface ProductDivision {
  id: number
  name: string
}

/** Normalised product-division list result: a page of rows + pagination. */
export interface ProductDivisionListResult {
  items: ProductDivision[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface Distributor {
  id: string

  // --- Firm & owner details ---
  firmName: string
  firmType: FirmType
  ownerName: string
  ownerMobile: string
  ownerBirthDate?: string
  ownerAnniversaryDate?: string
  communicationMobile?: string
  multipleLogin?: YesNo
  email: string
  code: string
  status: DistributorStatus
  onboardingStatus: DistributorOnboardingStatus
  /** Product-division names resolved by the list endpoint (`product_division_names`). */
  productDivisionNames?: string[]

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
  deliveryRoute?: string
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
  paymentCondition?: PaymentCondition
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
  ownerName: string
  ownerMobile: string
  ownerBirthDate?: string
  ownerAnniversaryDate?: string
  communicationMobile?: string
  multipleLogin?: YesNo
  email: string
  code?: string
  status: DistributorStatus
  /** Selected product-division ids (as strings; sent to the API as numbers). */
  productDivisions?: string[]

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
  deliveryRoute?: string
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
  paymentCondition?: PaymentCondition
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
  ownerName: string | null
  ownerMobile: string | null
  ownerBirthDate: string | null
  ownerAnniversaryDate: string | null
  communicationMobile: string | null
  multipleLogin: boolean | null
  email: string | null

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
  deliveryRoute: string | null
  marketType: string | null
  marketSystem: string | null
  weeklyOff: string | null
  geoLocation: string | null
  retailersLocal: number | null
  retailersRural: number | null
  officeImageUrls: string[]
  godownImageUrls: string[]

  // --- Business details ---
  /** Product-division names this distributor handles. */
  productDivisionNames: string[]
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
  paymentCondition: string | null
  bankAccountName: string | null
  bankAccountNumber: string | null
  bankIfsc: string | null
  bankName: string | null
}

// --- Live list API (GET /sales-incharge-admin/distributors) -----------------

/** Columns the list endpoint can sort by. */
export type DistributorSortBy =
  | 'firm_name'
  | 'owner_name'
  | 'owner_mobile'
  | 'email'
  | 'city_id'
  | 'status'

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
