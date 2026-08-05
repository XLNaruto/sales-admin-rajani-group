import { createFileRoute } from '@tanstack/react-router'
import { JourneyPlanPage } from '@/features/journey-management'
import { validateDataSearch } from '@/lib/route-search'
import { requirePermission } from '@/features/permissions'

/**
 * `?data=` carries `{ id, inchargeId, month }` for the plan being opened. With no
 * token the screen opens the current month's first one — the incharge travels
 * alongside the id because the month pager has to find the *same person's* next
 * month, whose plan id it does not yet know.
 *
 * Opening a plan needs `journey-plan:read`. Editing the allocation or correcting
 * the schedule (`journey-plan:update`), publishing and approving
 * (`journey-plan:approve` — **one key for both ends of the chain**) and the
 * assistant (`journey-plan-agent:use`) are all checked on the controls, so
 * read-only reviewers still see the month.
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
