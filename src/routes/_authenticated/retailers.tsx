import { createFileRoute } from '@tanstack/react-router'
import { RetailersPage } from '@/features/retailer-management'

export const Route = createFileRoute('/_authenticated/retailers')({
  component: RetailersPage,
})
