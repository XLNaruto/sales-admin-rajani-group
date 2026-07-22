/** Lifecycle status of a beat. */
export type BeatStatus = 'active' | 'inactive'

/** Beat grade — the market classification a beat falls under. */
export type BeatGrade = 'urban' | 'semi_urban' | 'metro' | 'non_metro' | 'rural'

/** A beat as shown in the list — the four core fields plus resolved labels. */
export interface Beat {
  id: string
  beatName: string
  beatGrade: BeatGrade
  distributorId: string
  /** Resolved distributor label from the list endpoint (for display). */
  distributorName?: string
  status: BeatStatus
}

/** Body for creating/updating a beat (everything except the generated id). */
export interface BeatInput {
  beatName: string
  beatGrade: BeatGrade
  distributorId: string
  status: BeatStatus
}

/** Columns the list endpoint can sort by. */
export type BeatSortBy = 'beat_name' | 'beat_grade' | 'created_at' | 'updated_at'

/** Query params accepted by the beat list endpoint (camelCase). */
export interface BeatListParams {
  page?: number
  pageSize?: number
  search?: string
  grade?: BeatGrade
  status?: BeatStatus
  sortBy?: BeatSortBy
  sortOrder?: 'asc' | 'desc'
}

/** One page of the server-filtered beat list. */
export interface BeatListResult {
  items: Beat[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
