import { createFileRoute } from '@tanstack/react-router'
import { SalesInchargePage } from '@/features/sales-incharge'

export const Route = createFileRoute('/_authenticated/sales-incharge/')({
  component: SalesInchargePage,
})
