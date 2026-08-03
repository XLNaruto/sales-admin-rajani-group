import { useEffect, useState } from 'react'
import { fetchRoadRoute, type RoadRoute } from '../lib/road-route'
import type { GeoPoint } from '../types'

/** Everything straight — what we show before, and instead of, road geometry. */
function raw(points: GeoPoint[]): RoadRoute {
  return {
    segments: [{ path: points, snapped: false }],
    snapped: false,
    meters: 0,
    status: null,
  }
}

/**
 * Road-snapped geometry for an ordered list of stops.
 *
 * Directions is a browser-side Maps service rather than our own API, so it stays
 * on local state instead of TanStack Query: there is no axios client, no key in
 * `query-keys.ts` and nothing to invalidate — the result is a pure function of
 * the coordinates and is memoised inside the service.
 */
export function useRoadRoute(points: GeoPoint[], ready: boolean): RoadRoute & { loading: boolean } {
  const [route, setRoute] = useState<RoadRoute>(() => raw(points))
  const [loading, setLoading] = useState(false)

  // Coordinates, not the array identity: the parent rebuilds `visits` on every
  // filter change and the geometry only depends on where the stops are.
  const key = points.map((p) => `${p.lat},${p.lng}`).join('|')

  useEffect(() => {
    if (!ready || points.length < 2) {
      setRoute(raw(points))
      setLoading(false)
      return
    }
    let active = true
    // Straight lines while Directions answers, so the trail is never missing.
    setRoute(raw(points))
    setLoading(true)
    fetchRoadRoute(points)
      .then((result) => active && setRoute(result))
      .catch(() => active && setRoute(raw(points)))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key])

  return { ...route, loading }
}
