import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import { calculateTada } from '../lib/tada-calc'
import type { TadaClaim, TadaMaster } from '../types'

const TADA_MASTER: TadaMaster[] = [
  { id: 'm1', grade: 'L1', hqType: 'metro', dailyAllowance: 800, perKmRate: 8, effectiveFrom: '2025-04-01' },
  { id: 'm2', grade: 'L1', hqType: 'non-metro', dailyAllowance: 600, perKmRate: 7, effectiveFrom: '2025-04-01' },
  { id: 'm3', grade: 'L2', hqType: 'metro', dailyAllowance: 1200, perKmRate: 10, effectiveFrom: '2025-04-01' },
  { id: 'm4', grade: 'L2', hqType: 'non-metro', dailyAllowance: 950, perKmRate: 9, effectiveFrom: '2025-04-01' },
  { id: 'm5', grade: 'L3', hqType: 'metro', dailyAllowance: 1800, perKmRate: 12, effectiveFrom: '2025-04-01' },
  { id: 'm6', grade: 'L3', hqType: 'non-metro', dailyAllowance: 1400, perKmRate: 11, effectiveFrom: '2025-04-01' },
  // Revised metro L2 rate effective mid-year — exercises effective-date logic.
  { id: 'm7', grade: 'L2', hqType: 'metro', dailyAllowance: 1350, perKmRate: 11, effectiveFrom: '2026-04-01' },
]

const TADA_CLAIMS: TadaClaim[] = [
  { id: 'c1', employee: 'Ramesh Yadav', grade: 'L1', hqType: 'non-metro', date: '2026-06-28', distanceKm: 120, days: 2, additional: 300, computedTotal: 0, status: 'pending' },
  { id: 'c2', employee: 'Suresh Patil', grade: 'L2', hqType: 'metro', date: '2026-06-30', distanceKm: 60, days: 1, additional: 0, computedTotal: 0, status: 'approved' },
  { id: 'c3', employee: 'Anita Deshmukh', grade: 'L3', hqType: 'metro', date: '2026-06-25', distanceKm: 210, days: 3, additional: 1200, computedTotal: 0, status: 'paid' },
  { id: 'c4', employee: 'Vikram Chauhan', grade: 'L1', hqType: 'metro', date: '2026-07-01', distanceKm: 45, days: 1, additional: 150, computedTotal: 0, status: 'pending' },
  { id: 'c5', employee: 'Pooja Nair', grade: 'L2', hqType: 'non-metro', date: '2026-06-29', distanceKm: 180, days: 2, additional: 0, computedTotal: 0, status: 'rejected' },
  { id: 'c6', employee: 'Karan Mehta', grade: 'L3', hqType: 'non-metro', date: '2026-07-01', distanceKm: 300, days: 4, additional: 800, computedTotal: 0, status: 'pending' },
]

/** Recompute totals from the master so displayed values always match the rules. */
function withComputedTotals(claims: TadaClaim[], master: TadaMaster[]): TadaClaim[] {
  return claims.map((claim) => ({
    ...claim,
    computedTotal: calculateTada(
      {
        grade: claim.grade,
        hqType: claim.hqType,
        onDate: claim.date,
        distanceKm: claim.distanceKm,
        days: claim.days,
        additional: claim.additional,
      },
      master,
    ).total,
  }))
}

export function useTadaMaster() {
  return useQuery({
    queryKey: queryKeys.expenseTada.master(),
    queryFn: () => mockDelay(TADA_MASTER),
  })
}

export function useTadaClaims() {
  return useQuery({
    queryKey: queryKeys.expenseTada.claims(),
    queryFn: () => mockDelay(withComputedTotals(TADA_CLAIMS, TADA_MASTER)),
  })
}

export interface SubmitClaimInput {
  employee: string
  grade: string
  hqType: TadaClaim['hqType']
  date: string
  distanceKm: number
  days: number
  additional: number
}

export function useSubmitClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SubmitClaimInput) => {
      const computedTotal = calculateTada(
        { ...payload, onDate: payload.date },
        TADA_MASTER,
      ).total
      return mockDelay<TadaClaim>({
        id: `c-${Date.now()}`,
        ...payload,
        computedTotal,
        status: 'pending',
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.expenseTada.all }),
  })
}
