/**
 * Query hooks over the Places service.
 *
 * Places data is server state (someone else's server, but server state all the
 * same), so it lives in TanStack Query — and it is cached hard: a shop's name,
 * category and address do not change between two clicks on the same map pin,
 * and every refetch is a billed call.
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPlaceDetails, findPlaceIdNear } from './places-api'

/** A day is well inside how often a place's details actually change. */
const PLACE_STALE_MS = 24 * 60 * 60 * 1000

/**
 * The place a coordinate is standing at, in two hops: nearest id, then details.
 *
 * Coordinates come in as the **strings** the ledger holds — they key the cache
 * exactly as received, so the same fix always hits the same entry, and the parse
 * to numbers happens once, on the way into the request.
 *
 * `enabled` is how a caller keeps this idle: a popup should only look a place up
 * once it is actually open, not for every marker on the map.
 */
export function usePlaceAtPoint(
  latitude: string | null | undefined,
  longitude: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  const lat = latitude == null ? NaN : Number(latitude)
  const lng = longitude == null ? NaN : Number(longitude)
  const usable =
    Number.isFinite(lat) && Number.isFinite(lng) && (options.enabled ?? true)

  const nearby = useQuery({
    queryKey: queryKeys.places.near(latitude ?? '', longitude ?? ''),
    queryFn: () => findPlaceIdNear({ lat, lng }),
    enabled: usable,
    staleTime: PLACE_STALE_MS,
    gcTime: PLACE_STALE_MS,
    retry: false,
  })

  const placeId = nearby.data ?? null

  const details = usePlaceDetails(placeId, { enabled: usable })

  return {
    place: details.data ?? null,
    /** Loading while either hop is in flight — the card shows one skeleton. */
    isLoading: usable && (nearby.isLoading || (Boolean(placeId) && details.isLoading)),
    /**
     * The lookup finished and there is simply no place here — a coordinate on a
     * road between shops. A real answer, rendered as such, never as an error.
     */
    isEmpty: usable && !nearby.isLoading && !placeId,
  }
}

/** GET /places/{id} — one place, when its id is already known. */
export function usePlaceDetails(
  placeId: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.places.details(placeId ?? ''),
    queryFn: () => fetchPlaceDetails(placeId as string),
    enabled: Boolean(placeId) && (options.enabled ?? true),
    staleTime: PLACE_STALE_MS,
    gcTime: PLACE_STALE_MS,
    retry: false,
  })
}
