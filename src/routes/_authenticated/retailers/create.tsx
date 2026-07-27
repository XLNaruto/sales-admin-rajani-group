import { createFileRoute } from '@tanstack/react-router'
import { RetailerCreatePage } from '@/features/retailer-management'
import { requirePermission } from '@/features/permissions'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/retailers/create')({
  // Doubles as the edit route (via `?data=`), so allow create OR update.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      'retailer-master:create',
      'retailer-master:update',
    ]),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <RetailerCreatePage data={data} />
}
