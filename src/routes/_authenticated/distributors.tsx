import { createFileRoute } from '@tanstack/react-router'
import { DistributorsPage } from '@/features/distributor-management'

export const Route = createFileRoute('/_authenticated/distributors')({
  component: DistributorsPage,
})
