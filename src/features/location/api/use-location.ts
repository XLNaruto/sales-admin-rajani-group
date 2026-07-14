import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchCities,
  fetchDistricts,
  fetchStates,
  fetchTalukas,
  fetchZones,
} from './location-api'
import type {
  CityParams,
  DistrictParams,
  LocationListResult,
  StateParams,
  TalukaParams,
  ZoneParams,
} from '../types'

/**
 * Geography master hooks. Each dependent level auto-disables until its parent
 * id is supplied, so cascading selects don't fire a request for "all zones"
 * before a state is chosen (pass `enabled` to override).
 *
 * Geography changes rarely, so results are cached for 5 minutes.
 */
const STALE_TIME = 5 * 60 * 1000

/** The endpoint caps `limit` at 100; page dropdowns in bite-sized chunks. */
export const LOCATION_PAGE_SIZE = 50

/** Given the pages fetched so far, the offset for the next page (or undefined). */
function nextOffset<T>(
  lastPage: LocationListResult<T>,
  allPages: LocationListResult<T>[],
): number | undefined {
  const loaded = allPages.reduce((n, p) => n + p.items.length, 0)
  return loaded < lastPage.total ? loaded : undefined
}

/** GET /sales-incharge-admin/states */
export function useStates(params: StateParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.location.states(params as Record<string, unknown>),
    queryFn: () => fetchStates(params),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? true,
  })
}

/** GET /sales-incharge-admin/zones — scoped to a state. */
export function useZones(params: ZoneParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.location.zones(params as Record<string, unknown>),
    queryFn: () => fetchZones(params),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? params.stateId != null,
  })
}

/** GET /sales-incharge-admin/districts — scoped to a zone. */
export function useDistricts(params: DistrictParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.location.districts(params as Record<string, unknown>),
    queryFn: () => fetchDistricts(params),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? params.zoneId != null,
  })
}

/** GET /sales-incharge-admin/talukas — scoped to a district. */
export function useTalukas(params: TalukaParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.location.talukas(params as Record<string, unknown>),
    queryFn: () => fetchTalukas(params),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? params.districtId != null,
  })
}

/** GET /sales-incharge-admin/cities — scoped to a taluka. */
export function useCities(params: CityParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.location.cities(params as Record<string, unknown>),
    queryFn: () => fetchCities(params),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? params.talukaId != null,
  })
}

/* ------------------------------------------------------------------ *
 * Infinite variants — page through a master `LOCATION_PAGE_SIZE` rows *
 * at a time. Back the scroll-lazy comboboxes with these. `limit` /    *
 * `offset` are owned by the hook; callers pass only the filters.      *
 * ------------------------------------------------------------------ */

type InfiniteFilters<P> = Omit<P, 'limit' | 'offset'>

/** GET /sales-incharge-admin/states — infinite. */
export function useStatesInfinite(
  params: InfiniteFilters<StateParams> = {},
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: queryKeys.location.states(params as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      fetchStates({ ...params, limit: LOCATION_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? true,
  })
}

/** GET /sales-incharge-admin/zones — infinite, scoped to a state. */
export function useZonesInfinite(
  params: InfiniteFilters<ZoneParams> = {},
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: queryKeys.location.zones(params as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      fetchZones({ ...params, limit: LOCATION_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? params.stateId != null,
  })
}

/** GET /sales-incharge-admin/districts — infinite, scoped to a zone. */
export function useDistrictsInfinite(
  params: InfiniteFilters<DistrictParams> = {},
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: queryKeys.location.districts(params as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      fetchDistricts({ ...params, limit: LOCATION_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? params.zoneId != null,
  })
}

/** GET /sales-incharge-admin/talukas — infinite, scoped to a district. */
export function useTalukasInfinite(
  params: InfiniteFilters<TalukaParams> = {},
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: queryKeys.location.talukas(params as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      fetchTalukas({ ...params, limit: LOCATION_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? params.districtId != null,
  })
}

/** GET /sales-incharge-admin/cities — infinite, scoped to a taluka. */
export function useCitiesInfinite(
  params: InfiniteFilters<CityParams> = {},
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: queryKeys.location.cities(params as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      fetchCities({ ...params, limit: LOCATION_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? params.talukaId != null,
  })
}
