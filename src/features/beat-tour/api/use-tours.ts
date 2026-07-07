import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { TourPlan } from '../types'

const TOUR_PLANS: TourPlan[] = [
  { id: 't1', salesman: 'R. Mehta', date: '2026-07-02', beat: 'Andheri East Beat', status: 'scheduled', stops: 12 },
  { id: 't2', salesman: 'S. Patel', date: '2026-07-02', beat: 'Bandra Retail Beat', status: 'completed', stops: 9 },
  { id: 't3', salesman: 'K. Rao', date: '2026-07-03', beat: 'Pune Camp Beat', status: 'scheduled', stops: 8 },
  { id: 't4', salesman: 'A. Singh', date: '2026-07-01', beat: 'Nashik City Beat', status: 'pending', stops: 6 },
  { id: 't5', salesman: 'R. Mehta', date: '2026-07-04', beat: 'Thane Wholesale Beat', status: 'scheduled', stops: 15 },
  { id: 't6', salesman: 'D. Shah', date: '2026-07-05', beat: 'Surat Textile Beat', status: 'pending', stops: 5 },
  { id: 't7', salesman: 'K. Rao', date: '2026-06-30', beat: 'Vadodara Central Beat', status: 'completed', stops: 11 },
]

export function useTourPlans(period?: string) {
  return useQuery({
    queryKey: queryKeys.beatTour.tourPlans(period),
    queryFn: () => mockDelay(TOUR_PLANS),
  })
}

export function useApproveTour() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mockDelay({ id, status: 'scheduled' as const }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.beatTour.all }),
  })
}
