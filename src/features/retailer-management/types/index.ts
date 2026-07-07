export type RetailerStatus = 'active' | 'inactive' | 'pending'

export interface Retailer {
  id: string
  name: string
  code: string
  distributor: string
  zone: string
  category: string
  monthlySales: number
  status: RetailerStatus
}

export interface RetailerAnalytics {
  byCategory: { name: string; value: number }[]
  byZone: { zone: string; retailers: number; sales: number }[]
}
