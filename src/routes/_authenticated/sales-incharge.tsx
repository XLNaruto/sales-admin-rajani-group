import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/sales-incharge')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'sales-incharge:list'),
  component: Outlet,
})
