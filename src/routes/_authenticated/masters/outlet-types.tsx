import { createFileRoute } from '@tanstack/react-router'
import { OutletTypesPage } from '@/features/master-management'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/masters/outlet-types')({
  // Reading the master needs `outlet-type:list`; the write actions
  // (`outlet-type:create|update|delete`) are gated inside the page via `useCan()`.
  beforeLoad: ({ context }) => requirePermission(context.queryClient, 'outlet-type:list'),
  component: OutletTypesPage,
})
