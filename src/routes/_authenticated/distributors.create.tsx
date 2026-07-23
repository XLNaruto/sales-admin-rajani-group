import { createFileRoute } from '@tanstack/react-router'
import { DistributorCreatePage } from '@/features/distributor-management'
import { requirePermission } from '@/features/permissions'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/distributors/create')({
  // Doubles as the edit route (via `?data=`), so allow create OR update.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      'distributor-master:create',
      'distributor-master:update',
    ]),
  validateSearch: (search: Record<string, unknown>): { data?: string } => ({
    data: typeof search.data === 'string' ? search.data : undefined,
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DistributorCreatePage data={data} />
}
