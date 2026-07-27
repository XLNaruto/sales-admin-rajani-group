import { createFileRoute } from '@tanstack/react-router'
import { BeatAllocationPage } from '@/features/sales-incharge'
import { requirePermission } from '@/features/permissions'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` carries the sales-incharge to allocate beats for. */
export const Route = createFileRoute(
  '/_authenticated/sales-incharge/beat-allocation',
)({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'beat:allocate'),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <BeatAllocationPage data={data} />
}
