import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { LeaveRequest } from '../types'

const LEAVES: LeaveRequest[] = [
  { id: 'lv1', employee: 'Ramesh Yadav', code: 'EMP-101', type: 'Casual', from: '2026-07-04', to: '2026-07-05', days: 2, reason: 'Family function', status: 'pending' },
  { id: 'lv2', employee: 'Suresh Patil', code: 'EMP-104', type: 'Sick', from: '2026-07-01', to: '2026-07-02', days: 2, reason: 'Fever', status: 'approved' },
  { id: 'lv3', employee: 'Anita Deshmukh', code: 'EMP-108', type: 'Earned', from: '2026-07-10', to: '2026-07-14', days: 5, reason: 'Vacation', status: 'pending' },
  { id: 'lv4', employee: 'Vikram Chauhan', code: 'EMP-112', type: 'Casual', from: '2026-06-28', to: '2026-06-28', days: 1, reason: 'Personal work', status: 'rejected' },
  { id: 'lv5', employee: 'Pooja Nair', code: 'EMP-115', type: 'Sick', from: '2026-07-03', to: '2026-07-03', days: 1, reason: 'Migraine', status: 'pending' },
  { id: 'lv6', employee: 'Karan Mehta', code: 'EMP-119', type: 'Unpaid', from: '2026-07-15', to: '2026-07-20', days: 6, reason: 'Out of station', status: 'approved' },
]

export function useLeaves() {
  return useQuery({
    queryKey: queryKeys.employees.leaves(),
    queryFn: () => mockDelay(LEAVES),
  })
}

export function useApproveLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; status: 'approved' | 'rejected' }) =>
      mockDelay({ ...payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.employees.all }),
  })
}
