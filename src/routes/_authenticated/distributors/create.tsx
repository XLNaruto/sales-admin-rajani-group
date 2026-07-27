import { createFileRoute } from '@tanstack/react-router'
import { DistributorCreatePage } from '@/features/distributor-management'
import { requirePermission } from '@/features/permissions'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/distributors/create')({
  // Doubles as the edit route (via `?data=`), so allow create OR update.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      'distributor-master:create',
      'distributor-master:update',
    ]),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DistributorCreatePage data={data} />
}
