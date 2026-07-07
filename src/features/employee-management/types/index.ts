export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid'
export type TaskStatus = 'open' | 'in-progress' | 'completed' | 'overdue'

export interface Employee {
  id: string
  name: string
  code: string
  designation: string
  department: string
  region: string
  status: 'active' | 'inactive'
}

export interface LeaveRequest {
  id: string
  employee: string
  code: string
  type: 'Casual' | 'Sick' | 'Earned' | 'Unpaid'
  from: string
  to: string
  days: number
  reason: string
  status: LeaveStatus
}

export interface ExpenseClaim {
  id: string
  employee: string
  code: string
  category: 'Travel' | 'Food' | 'Lodging' | 'Fuel' | 'Misc'
  amount: number
  date: string
  status: ExpenseStatus
}

export interface EmployeeTask {
  id: string
  title: string
  assignee: string
  priority: 'low' | 'medium' | 'high'
  dueDate: string
  progress: number
  status: TaskStatus
}
