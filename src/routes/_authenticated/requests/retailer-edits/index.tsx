import { createFileRoute } from '@tanstack/react-router'
import { RetailerEditRequestsPage } from '@/features/field-requests'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/requests/retailer-edits/')({
  // The read key gates the screen; answering is gated inside the page via
  // `useCan('retailer-edit-request:approve')`.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'retailer-edit-request:list'),
  component: RetailerEditRequestsPage,
})
