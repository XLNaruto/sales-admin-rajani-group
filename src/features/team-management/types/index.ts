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

/**
 * A node in the salesman reporting hierarchy. Each node is a sales incharge:
 * `id`/`salesmanId` both carry the incharge's id (as a string), and the node
 * carries its own display fields so the tree renders without a side lookup.
 */
export interface HierarchyNode {
  id: string
  salesmanId: string
  name: string
  designation: string | null
  photoUrl?: string
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
