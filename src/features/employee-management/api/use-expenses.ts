import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { ExpenseClaim } from '../types'

const EXPENSES: ExpenseClaim[] = [
  { id: 'ex1', employee: 'Ramesh Yadav', code: 'EMP-101', category: 'Travel', amount: 3200, date: '2026-06-29', status: 'pending' },
  { id: 'ex2', employee: 'Suresh Patil', code: 'EMP-104', category: 'Fuel', amount: 1850, date: '2026-06-30', status: 'approved' },
  { id: 'ex3', employee: 'Anita Deshmukh', code: 'EMP-108', category: 'Lodging', amount: 4600, date: '2026-06-27', status: 'pending' },
  { id: 'ex4', employee: 'Vikram Chauhan', code: 'EMP-112', category: 'Food', amount: 780, date: '2026-06-28', status: 'paid' },
  { id: 'ex5', employee: 'Pooja Nair', code: 'EMP-115', category: 'Travel', amount: 2950, date: '2026-07-01', status: 'pending' },
  { id: 'ex6', employee: 'Karan Mehta', code: 'EMP-119', category: 'Misc', amount: 1200, date: '2026-06-26', status: 'rejected' },
  { id: 'ex7', employee: 'Deepa Iyer', code: 'EMP-122', category: 'Fuel', amount: 2100, date: '2026-07-01', status: 'approved' },
]

export function useExpenses() {
  return useQuery({
    queryKey: queryKeys.employees.expenses(),
    queryFn: () => mockDelay(EXPENSES),
  })
}
