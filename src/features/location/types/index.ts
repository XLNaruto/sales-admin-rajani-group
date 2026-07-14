/**
 * Client-facing (camelCase) geography types plus the query params each list
 * endpoint accepts. The masters form a strict hierarchy:
 *   State → Zone → District → Taluka → City
 * each level referencing its parent's id.
 */

/** Columns every master can sort by. */
export type LocationSortBy = 'name' | 'created_at' | 'updated_at'
export type SortOrder = 'asc' | 'desc'

/** Params common to all five endpoints. */
export interface BaseLocationParams {
  limit?: number
  offset?: number
  id?: number
  search?: string
  sortBy?: LocationSortBy
  sortOrder?: SortOrder
}

export type StateParams = BaseLocationParams
export interface ZoneParams extends BaseLocationParams {
  stateId?: number
}
export interface DistrictParams extends BaseLocationParams {
  zoneId?: number
}
export interface TalukaParams extends BaseLocationParams {
  districtId?: number
}
export interface CityParams extends BaseLocationParams {
  talukaId?: number
}

export interface StateItem {
  id: number
  name: string
}

export interface ZoneItem {
  id: number
  stateId: number
  stateName: string | null
  name: string
}

export interface DistrictItem {
  id: number
  zoneId: number
  zoneName: string | null
  name: string
}

export interface TalukaItem {
  id: number
  districtId: number
  districtName: string | null
  zoneId: number | null
  zoneName: string | null
  name: string
}

export interface CityItem {
  id: number
  talukaId: number
  talukaName: string | null
  districtId: number | null
  districtName: string | null
  zoneId: number | null
  zoneName: string | null
  stateId: number | null
  stateName: string | null
  name: string
}

/** Normalised list result (rows + total for pagination). */
export interface LocationListResult<T> {
  items: T[]
  total: number
}
