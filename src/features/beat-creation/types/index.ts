/**
 * Beat grade — the market classification a beat falls under. Server-side `grade`
 * is a free string; this enum is the fixed set the create/edit form offers.
 */
export type BeatGrade = 'local' | 'rural'

/** A distributor attached to a beat — id plus its resolved label (if any). */
export interface BeatDistributor {
  id: string
  /** Resolved distributor label from the API (falls back to the id). */
  name: string
}

/** A beat as shown in the list — the core fields plus resolved labels. */
export interface Beat {
  id: string
  beatName: string
  /** Free-form grade string from the API (may be empty). */
  beatGrade: string
  /** Every distributor mapped to this beat (a beat can serve several). */
  distributors: BeatDistributor[]
}

/** One row from the lightweight beat-options endpoint — id plus display label. */
export interface BeatOption {
  id: string
  name: string
}

/** Query params accepted by the beat-options endpoint (camelCase). */
export interface BeatOptionsParams {
  page?: number
  pageSize?: number
  search?: string
}

/** One page of beat options plus its pagination metadata. */
export interface BeatOptionsResult {
  items: BeatOption[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * The answer from GET /sales-incharge-admin/beats/nearest. `resolved: false` is
 * a deliberate outcome, not a failure — no geo-tagged outlet sat inside the
 * radius, and leaving the outlet unassigned beats routing it into the wrong
 * salesman's day plan. Callers must treat it as "no suggestion", never guess.
 */
export interface NearestBeat {
  resolved: boolean
  /** The winning beat, or null when unresolved. */
  beatId: string | null
  beatName: string | null
  /** Distance to the winner's closest voting member (metres), not a centroid. */
  distanceMetres: number | null
  /** How many of the considered neighbours chose the winner. */
  votes: number
  /** How many neighbouring outlets were considered at all. */
  considered: number
  /** Which step of the resolution order produced the answer. */
  source: 'neighbour_vote' | 'beat_pin' | 'unresolved'
}

/** Body for creating/updating a beat (everything except the generated id). */
export interface BeatInput {
  beatName: string
  beatGrade: BeatGrade
  distributorIds: string[]
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
