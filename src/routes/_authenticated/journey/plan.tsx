import { createFileRoute } from '@tanstack/react-router'
import { JourneyPlanPage } from '@/features/journey-management'
import { validateDataSearch } from '@/lib/route-search'
import { requirePermission } from '@/features/permissions'

/**
 * `?data=` carries `{ id, inchargeId, month }` for the allocation being opened.
 * With no token the screen opens the current month's first one — the incharge
 * travels alongside the id because the month pager has to find the *same person's*
 * next month, whose plan id it does not yet know.
 *
 * Opening an allocation needs `journey-plan:read`; editing it
 * (`journey-plan:update`) and the assistant (`journey-plan-agent:use`) are checked
 * on the controls, so read-only reviewers still see the month.
 */
export const Route = createFileRoute('/_authenticated/journey/plan')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'journey-plan:read'),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <JourneyPlanPage data={data} />
}
