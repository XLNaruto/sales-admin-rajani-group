export type VisitStatus = 'completed' | 'scheduled' | 'pending'
export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled'
export type MarketVisitStatus = 'completed' | 'in-progress' | 'scheduled'

export interface VisitForm {
  id: string
  salesman: string
  retailer: string
  date: string
  purpose: string
  outcome: string
  status: VisitStatus
}

export interface Meeting {
  id: string
  title: string
  date: string
  attendees: number
  status: MeetingStatus
}

export interface MarketVisit {
  id: string
  salesman: string
  market: string
  date: string
  outletsCovered: number
  status: MarketVisitStatus
}

export interface VisitFormDraft {
  salesman: string
  retailer: string
  purpose: string
}
