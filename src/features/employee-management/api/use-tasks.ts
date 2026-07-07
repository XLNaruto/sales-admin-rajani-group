import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { EmployeeTask } from '../types'

const TASKS: EmployeeTask[] = [
  { id: 'tk1', title: 'Submit June beat coverage report', assignee: 'Ramesh Yadav', priority: 'high', dueDate: '2026-07-03', progress: 40, status: 'in-progress' },
  { id: 'tk2', title: 'Onboard 3 new retailers in Andheri', assignee: 'Suresh Patil', priority: 'medium', dueDate: '2026-07-08', progress: 0, status: 'open' },
  { id: 'tk3', title: 'Reconcile Q2 primary sales', assignee: 'Anita Deshmukh', priority: 'high', dueDate: '2026-06-30', progress: 60, status: 'overdue' },
  { id: 'tk4', title: 'Collect outstanding from Bhagwati Sales', assignee: 'Vikram Chauhan', priority: 'high', dueDate: '2026-07-05', progress: 100, status: 'completed' },
  { id: 'tk5', title: 'Update planogram photos for Pune stores', assignee: 'Pooja Nair', priority: 'low', dueDate: '2026-07-12', progress: 20, status: 'in-progress' },
  { id: 'tk6', title: 'Train new salesman on order app', assignee: 'Karan Mehta', priority: 'medium', dueDate: '2026-07-09', progress: 0, status: 'open' },
]

export function useTasks() {
  return useQuery({
    queryKey: queryKeys.employees.tasks(),
    queryFn: () => mockDelay(TASKS),
  })
}
