import { createFileRoute } from '@tanstack/react-router'
import { ExpenseTadaPage } from '@/features/expense-tada'

export const Route = createFileRoute('/_authenticated/expense-tada')({
  component: ExpenseTadaPage,
})
