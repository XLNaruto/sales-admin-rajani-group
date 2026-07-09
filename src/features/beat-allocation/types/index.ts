export type AllocationStatus = 'active' | 'ended'
export type AllocationSource = 'admin' | 'field_request'
export type ApprovalStatus = 'approved' | 'pending' | 'rejected'

export interface BeatAllocation {
  id: string
  beatId: string
  salesmanId: string
  /** Days this salesman covers this beat (subset of the beat's own days). */
  visitDays: string[]
  effectiveFrom: string
  /** null = current / open-ended allocation. */
  effectiveTo: string | null
  status: AllocationStatus
  source: AllocationSource
  approvalStatus: ApprovalStatus
  /** User id of whoever made the allocation. */
  allocatedBy: string
}

/** Payload for creating an allocation (everything except the generated id). */
export type BeatAllocationInput = Omit<BeatAllocation, 'id'>
