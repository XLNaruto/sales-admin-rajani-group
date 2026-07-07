export type BeatStatus = 'active' | 'inactive' | 'draft'
export type TourStatus = 'scheduled' | 'completed' | 'pending'

export interface Beat {
  id: string
  name: string
  territory: string
  salesman: string
  parties: number
  status: BeatStatus
}

export interface TourPlan {
  id: string
  salesman: string
  date: string
  beat: string
  status: TourStatus
  stops: number
}

export interface RouteMapping {
  id: string
  route: string
  territory: string
  beats: number
  distanceKm: number
  salesman: string
}

export interface BeatDraft {
  name: string
  territory: string
  salesman: string
}
