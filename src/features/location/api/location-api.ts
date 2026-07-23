import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import {
  cityListResponseSchema,
  districtListResponseSchema,
  stateListResponseSchema,
  talukaListResponseSchema,
  zoneListResponseSchema,
  type CityRow,
  type DistrictRow,
  type StateRow,
  type TalukaRow,
  type ZoneRow,
} from '../schemas'
import type {
  BaseLocationParams,
  CityItem,
  CityParams,
  DistrictItem,
  DistrictParams,
  LocationListResult,
  StateItem,
  StateParams,
  TalukaItem,
  TalukaParams,
  ZoneItem,
  ZoneParams,
} from '../types'

/** Common camelCase → snake_case query params shared by every master. */
function baseQuery(params: BaseLocationParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.id != null) q.id = params.id
  if (params.search) q.search = params.search
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/* ----------------------------- Row mappers ------------------------------ */

const toState = (r: StateRow): StateItem => ({ id: r.id, name: r.name })

const toZone = (r: ZoneRow): ZoneItem => ({
  id: r.id,
  stateId: r.state_id,
  stateName: r.state_name ?? null,
  name: r.name,
})

const toDistrict = (r: DistrictRow): DistrictItem => ({
  id: r.id,
  zoneId: r.zone_id,
  zoneName: r.zone_name ?? null,
  name: r.name,
})

const toTaluka = (r: TalukaRow): TalukaItem => ({
  id: r.id,
  districtId: r.district_id,
  districtName: r.district_name ?? null,
  zoneId: r.zone_id ?? null,
  zoneName: r.zone_name ?? null,
  name: r.name,
})

const toCity = (r: CityRow): CityItem => ({
  id: r.id,
  talukaId: r.taluka_id,
  talukaName: r.taluka_name ?? null,
  districtId: r.district_id ?? null,
  districtName: r.district_name ?? null,
  zoneId: r.zone_id ?? null,
  zoneName: r.zone_name ?? null,
  stateId: r.state_id ?? null,
  stateName: r.state_name ?? null,
  name: r.name,
})

/* ------------------------------ Endpoints ------------------------------- */

/** GET /sales-incharge-admin/states */
export async function fetchStates(
  params: StateParams = {},
): Promise<LocationListResult<StateItem>> {
  try {
    const raw = await http.get<unknown>(endpoints.LOCATION.STATES, {
      params: baseQuery(params),
    })
    const { items, total, page, pageSize, totalPages } =
      stateListResponseSchema.parse(raw)
    return { items: items.map(toState), total, page, pageSize, totalPages }
  } catch (error) {
    throw asApiError(error, 'Failed to load states.')
  }
}

/** GET /sales-incharge-admin/zones — filter by `state_id`. */
export async function fetchZones(
  params: ZoneParams = {},
): Promise<LocationListResult<ZoneItem>> {
  try {
    const q = baseQuery(params)
    if (params.stateId != null) q.state_id = params.stateId
    const raw = await http.get<unknown>(endpoints.LOCATION.ZONES, { params: q })
    const { items, total, page, pageSize, totalPages } =
      zoneListResponseSchema.parse(raw)
    return { items: items.map(toZone), total, page, pageSize, totalPages }
  } catch (error) {
    throw asApiError(error, 'Failed to load zones.')
  }
}

/** GET /sales-incharge-admin/districts — filter by `zone_id`. */
export async function fetchDistricts(
  params: DistrictParams = {},
): Promise<LocationListResult<DistrictItem>> {
  try {
    const q = baseQuery(params)
    if (params.zoneId != null) q.zone_id = params.zoneId
    const raw = await http.get<unknown>(endpoints.LOCATION.DISTRICTS, { params: q })
    const { items, total, page, pageSize, totalPages } =
      districtListResponseSchema.parse(raw)
    return { items: items.map(toDistrict), total, page, pageSize, totalPages }
  } catch (error) {
    throw asApiError(error, 'Failed to load districts.')
  }
}

/** GET /sales-incharge-admin/talukas — filter by `district_id`. */
export async function fetchTalukas(
  params: TalukaParams = {},
): Promise<LocationListResult<TalukaItem>> {
  try {
    const q = baseQuery(params)
    if (params.districtId != null) q.district_id = params.districtId
    const raw = await http.get<unknown>(endpoints.LOCATION.TALUKAS, { params: q })
    const { items, total, page, pageSize, totalPages } =
      talukaListResponseSchema.parse(raw)
    return { items: items.map(toTaluka), total, page, pageSize, totalPages }
  } catch (error) {
    throw asApiError(error, 'Failed to load talukas.')
  }
}

/** GET /sales-incharge-admin/cities — filter by `taluka_id`. */
export async function fetchCities(
  params: CityParams = {},
): Promise<LocationListResult<CityItem>> {
  try {
    const q = baseQuery(params)
    if (params.talukaId != null) q.taluka_id = params.talukaId
    const raw = await http.get<unknown>(endpoints.LOCATION.CITIES, { params: q })
    const { items, total, page, pageSize, totalPages } =
      cityListResponseSchema.parse(raw)
    return { items: items.map(toCity), total, page, pageSize, totalPages }
  } catch (error) {
    throw asApiError(error, 'Failed to load cities.')
  }
}
