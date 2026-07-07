export type DistributorStatus = 'active' | 'pending' | 'suspended'

export interface Distributor {
  id: string
  name: string
  code: string
  category: string
  zone: string
  incharge: string
  status: DistributorStatus
  monthlySales: number
  outstanding: number
}

export interface DistributorOnboarding {
  name: string
  code: string
  category: string
  zone: string
  gstin: string
  contact: string
}
