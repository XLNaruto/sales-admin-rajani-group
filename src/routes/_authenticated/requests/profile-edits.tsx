import { createFileRoute } from '@tanstack/react-router'
import { ProfileEditRequestsPage } from '@/features/field-requests'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/requests/profile-edits')({
  // The read key gates the screen; answering is gated separately inside the
  // page via `useCan('profile-edit-request:approve')`.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'profile-edit-request:list'),
  component: ProfileEditRequestsPage,
})
