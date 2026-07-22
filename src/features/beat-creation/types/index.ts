/**
 * Beat grade — the market classification a beat falls under. Server-side `grade`
 * is a free string; this enum is the fixed set the create/edit form offers.
 */
export type BeatGrade = 'urban' | 'semi_urban' | 'metro' | 'non_metro' | 'rural'

/** A beat as shown in the list — the core fields plus resolved labels. */
export interface Beat {
  id: string
  beatName: string
  /** Free-form grade string from the API (may be empty). */
  beatGrade: string
  distributorId: string
  /** Resolved distributor label from the list endpoint (for display). */
  distributorName?: string
}

/** Body for creating/updating a beat (everything except the generated id). */
export interface BeatInput {
  beatName: string
  beatGrade: BeatGrade
  distributorId: string
}

/** Columns the list endpoint can sort by. */
export type BeatSortBy = 'name' | 'grade' | 'created_at' | 'updated_at'

/** Query params accepted by the beat list endpoint (camelCase). */
export interface BeatListParams {
  page?: number
  pageSize?: number
  search?: string
  grade?: BeatGrade
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
