import { useMemo } from 'react'
import type { MapPoint } from '@/components/maps/salesman-map'
import { useFakeLocationAlerts, useLivePositions } from '../api/use-gps'

/**
 * Orchestrates the GPS-tracking screen: the live-position and fake-location
 * queries (the former polls on an interval), plus the map points and status
 * counts derived from them. The page consumes this and only renders.
 */
export function useGpsTracking() {
  const { data: pings, isLoading } = useLivePositions()
  const { data: alerts, isLoading: alertsLoading } = useFakeLocationAlerts()

  const points = useMemo<MapPoint[]>(
    () =>
      (pings ?? []).map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        label: `${p.salesmanName} • ${p.speedKmh} km/h`,
        status: p.status,
      })),
    [pings],
  )

  const counts = useMemo(() => {
    const source = pings ?? []
    return {
      online: source.filter((p) => p.status === 'online').length,
      offline: source.filter((p) => p.status === 'offline').length,
      suspicious: source.filter((p) => p.status === 'suspicious').length,
    }
  }, [pings])

  return {
    pings,
    isLoading,
    alerts,
    alertsLoading,
    points,
    counts,
  }
}
