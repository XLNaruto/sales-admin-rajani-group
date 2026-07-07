import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { FakeLocationAlert, GpsPing } from '../types'
import { detectFakeLocation } from '../lib/fake-location'

/** Latest ping per salesman — Rajkot / Saurashtra field belt (~22.x, 70–72.x). */
const PINGS: GpsPing[] = [
  { id: 'p1', salesmanId: 's1', salesmanName: 'R. Mehta', lat: 22.3039, lng: 70.8022, timestamp: '2026-07-02T09:40:00+05:30', speedKmh: 24, accuracy: 8, mockProvider: false, status: 'online' },
  { id: 'p2', salesmanId: 's2', salesmanName: 'K. Rao', lat: 22.4707, lng: 70.0577, timestamp: '2026-07-02T09:41:00+05:30', speedKmh: 46, accuracy: 12, mockProvider: false, status: 'online' },
  { id: 'p3', salesmanId: 's3', salesmanName: 'S. Patel', lat: 21.5222, lng: 70.4579, timestamp: '2026-07-02T09:38:00+05:30', speedKmh: 0, accuracy: 15, mockProvider: false, status: 'online' },
  { id: 'p4', salesmanId: 's4', salesmanName: 'A. Singh', lat: 22.2587, lng: 71.1924, timestamp: '2026-07-02T09:10:00+05:30', speedKmh: 0, accuracy: 20, mockProvider: false, status: 'offline' },
  { id: 'p5', salesmanId: 's5', salesmanName: 'D. Shah', lat: 22.6708, lng: 71.5724, timestamp: '2026-07-02T09:41:00+05:30', speedKmh: 60, accuracy: 0, mockProvider: true, status: 'suspicious' },
  { id: 'p6', salesmanId: 's6', salesmanName: 'M. Joshi', lat: 21.6417, lng: 69.6293, timestamp: '2026-07-02T09:39:00+05:30', speedKmh: 18, accuracy: 10, mockProvider: false, status: 'online' },
  { id: 'p7', salesmanId: 's7', salesmanName: 'P. Desai', lat: 22.0000, lng: 71.2000, timestamp: '2026-07-02T09:41:00+05:30', speedKmh: 140, accuracy: 6, mockProvider: false, status: 'suspicious' },
  { id: 'p8', salesmanId: 's8', salesmanName: 'V. Chauhan', lat: 22.8252, lng: 71.0212, timestamp: '2026-07-02T08:55:00+05:30', speedKmh: 0, accuracy: 25, mockProvider: false, status: 'offline' },
]

/**
 * Previous ping per salesman, used to derive speed/teleport heuristics.
 * Keyed by salesmanId. Only spoofed salesmen have an implausible delta.
 */
const PREVIOUS_PINGS: Record<string, GpsPing> = {
  s5: { id: 'p5-prev', salesmanId: 's5', salesmanName: 'D. Shah', lat: 22.3039, lng: 70.8022, timestamp: '2026-07-02T09:40:30+05:30', speedKmh: 55, accuracy: 0, mockProvider: true, status: 'suspicious' },
  s7: { id: 'p7-prev', salesmanId: 's7', salesmanName: 'P. Desai', lat: 21.7000, lng: 70.9000, timestamp: '2026-07-02T09:20:00+05:30', speedKmh: 40, accuracy: 8, mockProvider: false, status: 'online' },
}

/** Sample route breadcrumb per salesman for the route polyline. */
const ROUTES: Record<string, [number, number][]> = {
  s1: [
    [22.2900, 70.7700],
    [22.2960, 70.7850],
    [22.3010, 70.7940],
    [22.3039, 70.8022],
  ],
  s2: [
    [22.4500, 70.0300],
    [22.4620, 70.0450],
    [22.4707, 70.0577],
  ],
}

export function useLivePositions() {
  return useQuery({
    queryKey: queryKeys.gps.livePositions(),
    queryFn: () => mockDelay(PINGS),
    refetchInterval: 15000,
  })
}

export function useSalesmanRoute(salesmanId: string) {
  return useQuery({
    queryKey: queryKeys.gps.route(salesmanId),
    queryFn: () => mockDelay<[number, number][]>(ROUTES[salesmanId] ?? []),
    enabled: Boolean(salesmanId),
  })
}

export function useFakeLocationAlerts() {
  return useQuery({
    queryKey: queryKeys.gps.alerts(),
    queryFn: () => {
      const alerts: FakeLocationAlert[] = []
      for (const ping of PINGS) {
        const { suspicious, reasons } = detectFakeLocation(ping, PREVIOUS_PINGS[ping.salesmanId])
        if (suspicious) {
          alerts.push({
            id: `alert-${ping.id}`,
            salesmanId: ping.salesmanId,
            salesmanName: ping.salesmanName,
            timestamp: ping.timestamp,
            lat: ping.lat,
            lng: ping.lng,
            reasons,
            status: 'suspicious',
          })
        }
      }
      return mockDelay(alerts)
    },
  })
}
