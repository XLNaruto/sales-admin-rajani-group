import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { Distributor, DistributorOnboarding } from '../types'

const DISTRIBUTORS: Distributor[] = [
  { id: 'd1', name: 'Shree Traders', code: 'DST-001', category: 'A', zone: 'North', incharge: 'R. Mehta', status: 'active', monthlySales: 482000, outstanding: 38000 },
  { id: 'd2', name: 'Maruti Distributors', code: 'DST-002', category: 'B', zone: 'West', incharge: 'S. Patel', status: 'active', monthlySales: 361000, outstanding: 0 },
  { id: 'd3', name: 'Ganesh Agency', code: 'DST-003', category: 'A', zone: 'South', incharge: 'K. Rao', status: 'pending', monthlySales: 0, outstanding: 0 },
  { id: 'd4', name: 'Bhagwati Sales', code: 'DST-004', category: 'C', zone: 'East', incharge: 'A. Singh', status: 'suspended', monthlySales: 128000, outstanding: 96000 },
  { id: 'd5', name: 'Om Enterprises', code: 'DST-005', category: 'B', zone: 'West', incharge: 'S. Patel', status: 'active', monthlySales: 274000, outstanding: 12000 },
  { id: 'd6', name: 'Krishna Traders', code: 'DST-006', category: 'A', zone: 'North', incharge: 'R. Mehta', status: 'pending', monthlySales: 0, outstanding: 0 },
]

export function useDistributors() {
  return useQuery({
    queryKey: queryKeys.distributors.list(),
    queryFn: () => mockDelay(DISTRIBUTORS),
  })
}

export function usePendingDistributors() {
  return useQuery({
    queryKey: queryKeys.distributors.pendingApproval(),
    queryFn: () => mockDelay(DISTRIBUTORS.filter((d) => d.status === 'pending')),
  })
}

export function useOnboardDistributor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: DistributorOnboarding) => mockDelay({ id: 'new', ...payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.distributors.all }),
  })
}

export function useApproveDistributor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mockDelay({ id, status: 'active' as const }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.distributors.all }),
  })
}
