/**
 * A route-master row — a named delivery route belonging to a warehouse. The
 * distributor form's "Delivery Route" select picks one of these; the id is
 * stored as `delivery_route_id`.
 */
export interface RouteMasterRow {
  id: number
  name: string
  code: string
  warehouseId: number
  /** Resolved name of the parent warehouse, when the API sends one. */
  warehouseName: string | null
}

/** Columns the list endpoint can sort by (its documented `sort_by` enum). */
export type RouteSortBy = 'name' | 'code' | 'created_at' | 'updated_at'

/** Query params accepted by the route list endpoint (camelCase). */
export interface RouteListParams {
  page?: number
  pageSize?: number
  /** Filter to a single route by id. */
  id?: number
  /** Filter to routes belonging to this warehouse. */
  warehouseId?: number
  /** Case-insensitive match against the route's name or code. */
  search?: string
  sortBy?: RouteSortBy
  sortOrder?: 'asc' | 'desc'
}

/** Normalised route list result: a page of rows + pagination. */
export interface RouteListResult {
  items: RouteMasterRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
