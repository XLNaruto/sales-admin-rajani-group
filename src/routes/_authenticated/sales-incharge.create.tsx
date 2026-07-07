import { createFileRoute } from '@tanstack/react-router'
import { SalesInchargeCreatePage } from '@/features/sales-incharge'

export const Route = createFileRoute('/_authenticated/sales-incharge/create')({
  component: SalesInchargeCreatePage,
})
