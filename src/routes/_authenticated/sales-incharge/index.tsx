import { createFileRoute } from '@tanstack/react-router'
import { SalesInchargePage } from '@/features/sales-incharge'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/sales-incharge/')({
  // Block direct URL access when the user lacks the permission — hiding the
  // sidebar link alone doesn't stop someone navigating to /sales-incharge.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'sales-incharge:list'),
  component: SalesInchargePage,
})
