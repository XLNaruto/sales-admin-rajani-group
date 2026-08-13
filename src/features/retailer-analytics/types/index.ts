/**
 * Retailer Analytics — reporting shapes only. Nothing here is written back to
 * the server: every type describes a read model the analytics endpoints will
 * eventually return (today they are served from the demo dataset).
 */

/**
 * Lifecycle tag derived from a retailer's visit / order history. Never stored —
 * always computed from dates so the tag can't drift from the underlying data.
 * See `lib/retailer-tags.ts` for the rules.
 */
export type RetailerTag =
  | 'new-call'
  | 'active-call'
  | 'no-order'
  | 'to-be-dormant'
  | 'dormant'
  | 'never-visited'

/** The grouping a sales report is sliced by. */
export type SalesDimension = 'zone' | 'district' | 'city' | 'beat' | 'product'

/** How the "Retailers List" report is grouped. */
export type ListDimension = 'beat' | 'city'

/** Reporting window, resolved to a date range in the API layer. */
export type AnalyticsPeriod = 'this-month' | 'last-month' | 'last-3-months' | 'ytd'

/** Every filter the analytics screen can apply ('all' means unfiltered). */
export interface AnalyticsFilters {
  period: AnalyticsPeriod
  zoneId: string
  districtId: string
  cityId: string
  beatId: string
  productId: string
}

/** One row of a dimension-wise sales report (zone / district / city / beat / product). */
export interface DimensionSalesRow {
  id: string
  name: string
  /** Parent label for context — e.g. the zone a district belongs to. */
  parent?: string
  /** Retailers mapped to this bucket (products report: retailers that bought it). */
  retailers: number
  /** Retailers that placed at least one order in the period. */
  billedRetailers: number
  visits: number
  /** Visits that produced an order — drives the productivity %. */
  productiveVisits: number
  sales: number
  /** Same window, previous period — powers the growth column. */
  prevSales: number
}

/** Headline numbers for the selected filter set. */
export interface AnalyticsSummary {
  totalSales: number
  prevTotalSales: number
  totalRetailers: number
  billedRetailers: number
  visits: number
  productiveVisits: number
}

/** A retailer as it appears in the tag + list reports. */
export interface AnalyticsRetailer {
  id: string
  code: string
  shopName: string
  ownerName: string
  mobile: string
  zoneName: string
  districtName: string
  cityName: string
  beatName: string
  /** ISO date the outlet went live — the anchor for the "New Call" window. */
  activationDate: string
  /** ISO date of the last visit of any kind (undefined → never visited). */
  lastVisitDate?: string
  /** ISO date of the last productive (order-producing) visit. */
  lastOrderDate?: string
  visits: number
  productiveVisits: number
  sales: number
  orders: number
  /** Derived, not stored — see `resolveRetailerTag`. */
  tag: RetailerTag
}

/** Tag counts for the whole filtered set, in display order. */
export interface TagSummaryRow {
  tag: RetailerTag
  count: number
  /** Share of the filtered retailer base, 0–100. */
  share: number
}

/** One group of the beat-wise / city-wise retailer list. */
export interface RetailerListGroup {
  id: string
  name: string
  /** Parent label — the city a beat sits in, or the district for a city. */
  parent: string
  retailers: number
  activeRetailers: number
  sales: number
}
