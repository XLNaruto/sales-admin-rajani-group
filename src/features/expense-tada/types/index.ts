export type HqType = 'metro' | 'non-metro'

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'paid'

export interface TadaMaster {
  id: string
  grade: string
  hqType: HqType
  dailyAllowance: number
  perKmRate: number
  /** ISO date (YYYY-MM-DD) from which this rate is effective. */
  effectiveFrom: string
}

export interface TadaClaim {
  id: string
  employee: string
  grade: string
  hqType: HqType
  date: string
  distanceKm: number
  days: number
  additional: number
  computedTotal: number
  status: ClaimStatus
}
