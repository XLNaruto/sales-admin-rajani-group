import { createFileRoute } from '@tanstack/react-router'
import { DayChangesPage } from '@/features/field-requests'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/requests/day-changes')({
  // Hiding the sidebar link stops discovery, not access — the URL still
  // resolves if typed. `:list` is the read key; approving is gated separately
  // inside the page via `useCan('day-change:approve')`.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'day-change:list'),
  component: DayChangesPage,
})
