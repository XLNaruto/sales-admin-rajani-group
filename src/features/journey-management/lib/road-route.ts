import { env } from '@/config/env'
import type { GeoPoint } from '../types'

/**
 * Turns a day's ordered punch points into a *drivable* path.
 *
 * The raw trail is just GPS fixes, so joining them draws straight lines across
 * fields and rivers. Google's Routes API re-runs the same stops as a driving
 * route and hands back the road geometry, which is what makes the map read like
 * a journey instead of a scribble.
 *
 * Routes v2 (`:computeRoutes`) rather than the Maps JS `DirectionsService`: it
 * returns a `HIGH_QUALITY` polyline — full-resolution geometry, not the
 * simplified overview the legacy service gives — and it answers over plain HTTP,
 * so this stays a service rather than something that needs a live map object.
 *
 * Kept out of the component on purpose: it is an external integration (one
 * endpoint, one entry point) and the chunking / fallback rules below are worth
 * testing without a map in the way.
 */

const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes'

/** Only the two fields we draw with — Routes prices partly on the field mask. */
const FIELD_MASK = 'routes.polyline.encodedPolyline,routes.distanceMeters'

/** Routes accepts 25 intermediates, so 27 points including origin + destination. */
const MAX_POINTS_PER_LEG = 27

/** Requests are chunked with one shared point so the legs join seamlessly. */
const LEG_STEP = MAX_POINTS_PER_LEG - 1

/** Road geometry for a given stop list never changes — cache it for the session. */
const cache = new Map<string, RoadRoute>()

/** One drawn stretch of the trail. `snapped` false means "straight hop". */
export type RouteSegment = {
  path: GeoPoint[]
  snapped: boolean
}

export type RoadRoute = {
  /** Ordered stretches, source → destination. Draw each in its own style. */
  segments: RouteSegment[]
  /** True only when every stretch came back as road geometry. */
  snapped: boolean
  /** Road distance over the snapped stretches, in metres. 0 when nothing snapped. */
  meters: number
  /**
   * Why a leg failed, as Routes names it — `PERMISSION_DENIED` (API not enabled
   * or the key is restricted), `RESOURCE_EXHAUSTED` (quota), `ZERO_RESULTS` (no
   * drivable path). Null when nothing failed.
   */
  status: string | null
}

function keyOf(points: GeoPoint[]): string {
  return points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|')
}

/** Split the stops into overlapping legs small enough for one Routes call. */
function toLegs(points: GeoPoint[]): GeoPoint[][] {
  const legs: GeoPoint[][] = []
  for (let i = 0; i < points.length - 1; i += LEG_STEP) {
    legs.push(points.slice(i, i + MAX_POINTS_PER_LEG))
  }
  return legs
}

/** Routes takes every waypoint as `{ location: { latLng } }`. */
function waypoint(point: GeoPoint) {
  return { location: { latLng: { latitude: point.lat, longitude: point.lng } } }
}

type LegResult = { path: GeoPoint[] | null; meters: number; status: string }

/**
 * One `:computeRoutes` call — the leg's stops, driving, in the order given.
 *
 * `optimizeWaypointOrder` is left off: the trail is a record of what happened,
 * so the stop order is fixed. Traffic is deliberately unaware, too — this route
 * was already driven, and live conditions would both cost more per request and
 * describe the wrong moment.
 */
async function routeLeg(leg: GeoPoint[]): Promise<LegResult> {
  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.VITE_GOOGLE_MAPS_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        origin: waypoint(leg[0]),
        destination: waypoint(leg[leg.length - 1]),
        intermediates: leg.slice(1, -1).map(waypoint),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
        // The whole point of moving to Routes: geometry that stays on the road
        // at street zoom instead of cutting corners.
        polylineQuality: 'HIGH_QUALITY',
        polylineEncoding: 'ENCODED_POLYLINE',
        computeAlternativeRoutes: false,
        units: 'METRIC',
      }),
    })
  } catch {
    return { path: null, meters: 0, status: 'NETWORK_ERROR' }
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    return { path: null, meters: 0, status: body?.error?.status ?? `HTTP_${response.status}` }
  }

  // A leg with no drivable path comes back 200 with an empty `routes`.
  const route = body?.routes?.[0]
  const encoded = route?.polyline?.encodedPolyline
  if (!encoded) return { path: null, meters: 0, status: 'ZERO_RESULTS' }

  return { path: decodePolyline(encoded), meters: route.distanceMeters ?? 0, status: 'OK' }
}

/** Routes returns geometry encoded; the Maps SDK already knows how to read it. */
function decodePolyline(encoded: string): GeoPoint[] {
  return google.maps.geometry.encoding
    .decodePath(encoded)
    .map((point) => ({ lat: point.lat(), lng: point.lng() }))
}

/** Failures no amount of retrying will fix — the key or the quota, not the road. */
function isFatal(status: string): boolean {
  return (
    status === 'PERMISSION_DENIED' ||
    status === 'UNAUTHENTICATED' ||
    status === 'RESOURCE_EXHAUSTED' ||
    status.startsWith('HTTP_4')
  )
}

/**
 * Road-following geometry for `points`, in order.
 *
 * Resolution is per stretch, not all-or-nothing. A whole leg is tried first
 * (one call for up to 27 stops); if that leg fails it is retried hop by hop, so
 * a single unreachable outlet degrades to one straight dash instead of throwing
 * away the road path for the entire day. A key-level failure skips the retries —
 * every hop would fail the same way and each one still costs a request.
 */
export async function fetchRoadRoute(points: GeoPoint[]): Promise<RoadRoute> {
  if (points.length < 2) {
    return {
      segments: [{ path: points, snapped: false }],
      snapped: false,
      meters: 0,
      status: null,
    }
  }

  const key = keyOf(points)
  const cached = cache.get(key)
  if (cached) return cached

  const segments: RouteSegment[] = []
  let status: string | null = null
  let meters = 0
  let blocked = false

  for (const leg of toLegs(points)) {
    if (blocked) {
      segments.push({ path: leg, snapped: false })
      continue
    }
    const whole = await routeLeg(leg)
    if (whole.path) {
      segments.push({ path: whole.path, snapped: true })
      meters += whole.meters
      continue
    }
    status ??= whole.status
    if (isFatal(whole.status)) {
      blocked = true
      segments.push({ path: leg, snapped: false })
      continue
    }
    // Hop by hop, so the stops that *do* sit on a road still draw as roads.
    for (let i = 0; i < leg.length - 1; i += 1) {
      const hop = await routeLeg([leg[i], leg[i + 1]])
      segments.push(
        hop.path
          ? { path: hop.path, snapped: true }
          : { path: [leg[i], leg[i + 1]], snapped: false },
      )
      meters += hop.meters
    }
  }

  const route: RoadRoute = {
    segments,
    snapped: segments.every((segment) => segment.snapped),
    meters,
    status,
  }
  cache.set(key, route)
  return route
}
