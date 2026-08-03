import { createFileRoute } from '@tanstack/react-router'
import { JourneyPlanPage } from '@/features/journey-management'
import { validateDataSearch } from '@/lib/route-search'
import { requirePermission } from '@/features/permissions'

/**
 * `?data=` carries `{ id, inchargeId, month }` for the plan being reviewed. With no
 * token the screen opens the current month's first plan — a re-solve mints a new plan
 * id, which is why the incharge travels in the token alongside it.
 *
 * Opening a plan needs `journey-plan:read`; editing it (`journey-plan:update`),
 * approving it (`:approve`) and the assistant (`journey-plan-agent:use`) are
 * checked on the controls, so read-only reviewers still see the month.
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
