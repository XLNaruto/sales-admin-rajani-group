import { createFileRoute } from '@tanstack/react-router'
import { DistributorCreatePage } from '@/features/distributor-management'

export const Route = createFileRoute('/_authenticated/distributors/create')({
  component: DistributorCreatePage,
})
