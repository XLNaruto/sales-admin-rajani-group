export type BeatStatus = 'active' | 'inactive'
export type MarketType = 'local' | 'rural' | 'counter_sales'
export type MarketSystem = 'ready_stock' | 'booking'
export type VisitCycle = 'weekly' | 'fortnightly' | 'monthly'

/** A single ordered stop on the beat route. */
export interface BeatOutlet {
  retailerId: string
  /** 1-based visit order. */
  sequence: number
  geoLat?: number
  geoLng?: number
  geoFenceM?: number
}

export interface Beat {
  id: string
  // Beat details
  beatCode: string
  beatName: string
  status: BeatStatus
  marketType: MarketType
  marketSystem: MarketSystem
  // Territory & distributor
  stateId: string
  zoneId: string
  districtId: string
  talukaId: string
  cityId: string
  villageIds?: string[]
  distributorId: string
  // Schedule & allocation
  visitCycle: VisitCycle
  visitDays: string[]
  assignedSalesmanId: string
  beatProgramId?: string
  effectiveDate: string
  // Outlets & route
  outlets: BeatOutlet[]
}

/** Payload for creating a beat (everything except the generated id). */
export type BeatInput = Omit<Beat, 'id'>
