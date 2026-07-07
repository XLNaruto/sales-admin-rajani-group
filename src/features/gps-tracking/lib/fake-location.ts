import type { GpsPing } from '../types'

/** Maximum plausible ground speed for a field salesman (km/h). */
const MAX_PLAUSIBLE_SPEED_KMH = 120
/** A jump larger than this between consecutive pings is treated as a teleport (km). */
const TELEPORT_DISTANCE_KM = 5
/** A jump under this time window is too short to have covered a teleport distance (ms). */
const TELEPORT_WINDOW_MS = 60_000

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Great-circle distance between two lat/lng points, in kilometres.
 * Pure, framework-free — safe to unit test in isolation.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

export interface FakeLocationResult {
  suspicious: boolean
  reasons: string[]
}

/**
 * Heuristic fake-location / GPS-spoofing detector.
 *
 * Pure function — takes the current ping and (optionally) the previous ping
 * for the same salesman and returns whether the location looks spoofed along
 * with the reasons. No React, no network, no side effects.
 */
export function detectFakeLocation(
  ping: GpsPing,
  previous?: GpsPing,
): FakeLocationResult {
  const reasons: string[] = []

  if (ping.mockProvider) {
    reasons.push('Device reports a mock-location provider')
  }

  if (ping.accuracy <= 0) {
    reasons.push('Zero / invalid GPS accuracy')
  }

  if (previous) {
    const distanceKm = haversineKm(previous.lat, previous.lng, ping.lat, ping.lng)
    const elapsedMs = new Date(ping.timestamp).getTime() - new Date(previous.timestamp).getTime()
    const elapsedHours = elapsedMs / 3_600_000

    if (elapsedHours > 0) {
      const impliedSpeed = distanceKm / elapsedHours
      if (impliedSpeed > MAX_PLAUSIBLE_SPEED_KMH) {
        reasons.push(
          `Impossible speed between pings (~${Math.round(impliedSpeed)} km/h)`,
        )
      }
    }

    if (distanceKm > TELEPORT_DISTANCE_KM && elapsedMs > 0 && elapsedMs < TELEPORT_WINDOW_MS) {
      reasons.push(
        `Teleport jump of ~${distanceKm.toFixed(1)} km in under a minute`,
      )
    }
  }

  return { suspicious: reasons.length > 0, reasons }
}
