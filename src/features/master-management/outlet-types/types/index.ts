/** An outlet-type master row (id + display name, mapped from `type_name`). */
export interface OutletType {
  id: number
  name: string
}

/** Body for creating/updating an outlet type (everything but the generated id). */
export interface OutletTypeInput {
  name: string
}

/** Columns the list endpoint can sort by (its documented `sort_by` enum). */
export type OutletTypeSortBy = 'type_name' | 'created_at' | 'updated_at'

/**
 * Query params accepted by the outlet-type list endpoint (camelCase). Mirrors
 * the documented set exactly — the master carries no lifecycle/status filter.
 */
export interface OutletTypeListParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: OutletTypeSortBy
  sortOrder?: 'asc' | 'desc'
}

/** Normalised outlet-type list result: a page of rows + pagination. */
export interface OutletTypeListResult {
  items: OutletType[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
