import { createFileRoute } from '@tanstack/react-router'
import { AllocationListPage } from '@/features/journey-management'
import { requirePermission } from '@/features/permissions'

/**
 * The month's journey plans, one row per sales incharge.
 *
 * Reading the list needs `journey-plan:list`; generating a month is a separate key
 * (`journey-plan:create`) checked on the control itself, so a reviewer with
 * read-only access still gets the whole screen. No `:approve` check here either —
 * both transitions live on the plan screen, and the list is read-only.
 *
 * This screen has been at `/journey/approvals` and `/journey/allocations` before
 * now; both still resolve and redirect here, so old bookmarks keep working.
 */
export const Route = createFileRoute('/_authenticated/journey/plans')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'journey-plan:list'),
  component: AllocationListPage,
})
