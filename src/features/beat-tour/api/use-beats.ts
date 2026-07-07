import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { Beat, BeatDraft, RouteMapping } from '../types'

const BEATS: Beat[] = [
  { id: 'b1', name: 'Andheri East Beat', territory: 'Mumbai West', salesman: 'R. Mehta', parties: 42, status: 'active' },
  { id: 'b2', name: 'Bandra Retail Beat', territory: 'Mumbai West', salesman: 'S. Patel', parties: 31, status: 'active' },
  { id: 'b3', name: 'Pune Camp Beat', territory: 'Pune', salesman: 'K. Rao', parties: 27, status: 'active' },
  { id: 'b4', name: 'Nashik City Beat', territory: 'Nashik', salesman: 'A. Singh', parties: 18, status: 'draft' },
  { id: 'b5', name: 'Thane Wholesale Beat', territory: 'Thane', salesman: 'R. Mehta', parties: 55, status: 'active' },
  { id: 'b6', name: 'Surat Textile Beat', territory: 'Surat', salesman: 'D. Shah', parties: 12, status: 'inactive' },
  { id: 'b7', name: 'Vadodara Central Beat', territory: 'Vadodara', salesman: 'K. Rao', parties: 24, status: 'active' },
]

const ROUTE_MAPPINGS: RouteMapping[] = [
  { id: 'r1', route: 'West Coastal Loop', territory: 'Mumbai West', beats: 3, distanceKm: 46, salesman: 'R. Mehta' },
  { id: 'r2', route: 'Pune Highway Circuit', territory: 'Pune', beats: 2, distanceKm: 62, salesman: 'K. Rao' },
  { id: 'r3', route: 'Nashik Ring Route', territory: 'Nashik', beats: 2, distanceKm: 38, salesman: 'A. Singh' },
  { id: 'r4', route: 'Gujarat Industrial Belt', territory: 'Surat', beats: 4, distanceKm: 88, salesman: 'D. Shah' },
  { id: 'r5', route: 'Thane Suburban Route', territory: 'Thane', beats: 2, distanceKm: 29, salesman: 'S. Patel' },
]

export function useBeats() {
  return useQuery({
    queryKey: queryKeys.beatTour.beats(),
    queryFn: () => mockDelay(BEATS),
  })
}

export function useRouteMappings() {
  return useQuery({
    queryKey: queryKeys.beatTour.routeMapping(),
    queryFn: () => mockDelay(ROUTE_MAPPINGS),
  })
}

export function useCreateBeat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BeatDraft) =>
      mockDelay<Beat>({ id: `b-new`, parties: 0, status: 'draft', ...payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.beatTour.all }),
  })
}
