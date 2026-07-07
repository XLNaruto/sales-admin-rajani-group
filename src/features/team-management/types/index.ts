export type SalesmanStatus = 'active' | 'inactive' | 'online' | 'offline'

export interface Salesman {
  id: string
  name: string
  code: string
  incharge: string
  beat: string
  status: SalesmanStatus
  productivity: number
  visitsToday: number
  target: number
  achieved: number
}

/** A node in the salesman reporting hierarchy. References a salesman by id
 *  (resolved against the Sales Incharge list) and holds its direct reports. */
export interface HierarchyNode {
  id: string
  salesmanId: string
  children: HierarchyNode[]
}

export interface SalesInchargeOnboarding {
  name: string
  code: string
  region: string
  reportingTo: string
  contact: string
  email: string
}
