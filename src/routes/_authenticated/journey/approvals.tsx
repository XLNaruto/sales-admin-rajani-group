import { createFileRoute } from '@tanstack/react-router'
import { ApprovalQueuePage } from '@/features/journey-management'
import { requirePermission } from '@/features/permissions'

/**
 * Reading the queue needs `journey-plan:list`. Approving and generating are
 * separate keys (`journey-plan:approve` / `:create`) checked on the controls
 * themselves — a reviewer with read-only access still gets the whole screen.
 */
export const Route = createFileRoute('/_authenticated/journey/approvals')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'journey-plan:list'),
  component: ApprovalQueuePage,
})
