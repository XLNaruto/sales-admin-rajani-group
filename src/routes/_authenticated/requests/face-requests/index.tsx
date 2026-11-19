import { createFileRoute } from '@tanstack/react-router'
import { FaceRequestsPage } from '@/features/field-requests'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/requests/face-requests/')({
  // The read key gates the screen; answering is gated inside the page via
  // `useCan('sales-incharge-face-request:approve')`.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'sales-incharge-face-request:list'),
  component: FaceRequestsPage,
})
