import { createFileRoute } from '@tanstack/react-router'
import { AllocationListPage } from '@/features/journey-management'
import { requirePermission } from '@/features/permissions'

/**
 * The month's allocations, one row per sales incharge.
 *
 * Reading the list needs `journey-plan:list`; generating a month is a separate key
 * (`journey-plan:create`) checked on the control itself, so a reviewer with
 * read-only access still gets the whole screen. There is no `:approve` check —
 * nothing here is approved: an allocation is live the moment it exists.
 *
 * This screen used to live at `/journey/approvals`; that path still resolves and
 * redirects here, so old bookmarks keep working.
 */
export const Route = createFileRoute('/_authenticated/journey/allocations')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'journey-plan:list'),
  component: AllocationListPage,
})
