import { useApproveLeave, useLeaves } from '../api/use-leaves'
import { useExpenses } from '../api/use-expenses'
import { useTasks } from '../api/use-tasks'

/**
 * Orchestrates the employee-management screen: the leave/expense/task list
 * queries, derived KPI counts, the leave-approval mutation and its handlers.
 * The page consumes this and only renders — no data/handler logic lives in
 * the component.
 */
export function useEmployeeManagement() {
  const { data: leaves, isLoading: leavesLoading } = useLeaves()
  const { data: expenses, isLoading: expensesLoading } = useExpenses()
  const { data: tasks, isLoading: tasksLoading } = useTasks()
  const approveLeave = useApproveLeave()

  const pendingLeaves = (leaves ?? []).filter((l) => l.status === 'pending').length
  const pendingExpenses = (expenses ?? []).filter((e) => e.status === 'pending').length
  const openTasks = (tasks ?? []).filter(
    (t) => t.status === 'open' || t.status === 'in-progress',
  ).length

  const setLeaveStatus = (id: string, status: 'approved' | 'rejected') =>
    approveLeave.mutate({ id, status })

  return {
    leaves,
    leavesLoading,
    expenses,
    expensesLoading,
    tasks,
    tasksLoading,
    pendingLeaves,
    pendingExpenses,
    openTasks,
    isApprovingLeave: approveLeave.isPending,
    setLeaveStatus,
  }
}
