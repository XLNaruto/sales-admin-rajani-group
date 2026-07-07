import { createFileRoute } from '@tanstack/react-router'
import { EmployeesPage } from '@/features/employee-management'

export const Route = createFileRoute('/_authenticated/employees')({
  component: EmployeesPage,
})
