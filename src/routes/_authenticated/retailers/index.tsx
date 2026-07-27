import { createFileRoute } from '@tanstack/react-router'
import { RetailersPage } from '@/features/retailer-management'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/retailers/')({
  // Block direct URL access when the user lacks the permission — hiding the
  // sidebar link alone doesn't stop someone navigating to /retailers.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient,  //'retailer-master:list'
      'beat:list',
      
    ),
  component: RetailersPage,
})
