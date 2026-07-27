import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/distributors')({
  // Block direct URL access when the user lacks the permission — hiding the
  // sidebar link alone doesn't stop someone navigating to /distributors.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'distributor-master:list'),
  component: Outlet,
})
