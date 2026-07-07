import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { Salesman, SalesInchargeOnboarding } from '../types'

const SALESMEN: Salesman[] = [
  { id: 'sm1', name: 'Ramesh Yadav', code: 'SM-101', incharge: 'R. Mehta', beat: 'Andheri-01', status: 'online', productivity: 92, visitsToday: 24, target: 180000, achieved: 165600 },
  { id: 'sm2', name: 'Suresh Patil', code: 'SM-104', incharge: 'S. Patel', beat: 'Borivali-03', status: 'online', productivity: 78, visitsToday: 18, target: 150000, achieved: 117000 },
  { id: 'sm3', name: 'Anita Deshmukh', code: 'SM-108', incharge: 'R. Mehta', beat: 'Thane-02', status: 'offline', productivity: 64, visitsToday: 11, target: 140000, achieved: 89600 },
  { id: 'sm4', name: 'Vikram Chauhan', code: 'SM-112', incharge: 'K. Rao', beat: 'Pune-04', status: 'active', productivity: 85, visitsToday: 21, target: 160000, achieved: 136000 },
  { id: 'sm5', name: 'Pooja Nair', code: 'SM-115', incharge: 'S. Patel', beat: 'Kothrud-01', status: 'online', productivity: 88, visitsToday: 22, target: 155000, achieved: 136400 },
  { id: 'sm6', name: 'Karan Mehta', code: 'SM-119', incharge: 'K. Rao', beat: 'Nashik-02', status: 'inactive', productivity: 41, visitsToday: 5, target: 130000, achieved: 53300 },
  { id: 'sm7', name: 'Deepa Iyer', code: 'SM-122', incharge: 'R. Mehta', beat: 'Andheri-02', status: 'online', productivity: 73, visitsToday: 16, target: 145000, achieved: 105850 },
]

export function useSalesmen() {
  return useQuery({
    queryKey: queryKeys.team.salesmen(),
    queryFn: () => mockDelay(SALESMEN),
  })
}

const PRODUCTIVITY: Array<Record<string, string | number>> = [
  { beat: 'Andheri-01', target: 180, achieved: 166 },
  { beat: 'Borivali-03', target: 150, achieved: 117 },
  { beat: 'Thane-02', target: 140, achieved: 90 },
  { beat: 'Pune-04', target: 160, achieved: 136 },
  { beat: 'Kothrud-01', target: 155, achieved: 136 },
  { beat: 'Nashik-02', target: 130, achieved: 53 },
]

export function useProductivity() {
  return useQuery({
    queryKey: queryKeys.team.productivity(),
    queryFn: () => mockDelay(PRODUCTIVITY),
  })
}

export function useOnboardIncharge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SalesInchargeOnboarding) => mockDelay({ id: `inc-${Date.now()}`, ...payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.team.all }),
  })
}
