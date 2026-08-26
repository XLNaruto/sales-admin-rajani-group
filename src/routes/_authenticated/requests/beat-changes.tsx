import { createFileRoute } from '@tanstack/react-router'
import { BeatChangesPage } from '@/features/field-requests'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/requests/beat-changes')({
  // Hiding the sidebar link stops discovery, not access — the URL still
  // resolves if typed. `:list` is the read key; approving is gated separately
  // inside the page via `useCan('beat-change:approve')`.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'beat-change:list'),
  component: BeatChangesPage,
})
