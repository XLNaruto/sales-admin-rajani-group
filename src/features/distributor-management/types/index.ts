export type DistributorStatus = 'active' | 'pending' | 'suspended' | 'rejected'
export type FirmType = 'proprietorship' | 'partnership' | 'company'
export type YesNo = 'yes' | 'no'
export type DistributorMarketType = 'local' | 'rural' | 'local_rural' | 'counter_sales'
export type MarketSystem = 'ready_stock' | 'booking'
export type PaymentCondition = 'same_day_cheque' | 'due_date_neft_rtgs' | 'advance'

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
  /** Rows per page (1–100). Default 20. */
  limit?: number
  /** Rows to skip. Default 0. */
  offset?: number
  /** Case-insensitive match against firm/owner name, phone, email or code. */
  search?: string
  /** Filter by status. */
  status?: string
  /** Column to sort by. Defaults to newest first when omitted. */
  sortBy?: DistributorSortBy
  /** Sort direction. */
  sortOrder?: 'asc' | 'desc'
}

/** Normalised list result (rows + total for pagination). */
export interface DistributorListResult {
  items: Distributor[]
  total: number
}
