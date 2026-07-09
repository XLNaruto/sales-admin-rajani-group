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
  officeGodownImages?: string

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
  panPhoto?: string
  gstNumber?: string
  gstPhoto?: string
  advanceChequeNumbers?: string
  advanceChequePhoto?: string
  paymentCondition?: PaymentCondition
  bankDetails?: string
}

export type DistributorInput = Omit<Distributor, 'id'>
