export type ApprovalType = 'leave' | 'tour' | 'expense' | 'attendance'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface ApprovalItem {
  id: string
  type: ApprovalType
  requester: string
  submittedOn: string
  summary: string
  status: ApprovalStatus
}
