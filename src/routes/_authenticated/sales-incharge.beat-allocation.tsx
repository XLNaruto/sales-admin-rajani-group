import { createFileRoute } from '@tanstack/react-router'
import { BeatAllocationPage } from '@/features/sales-incharge'

/** `?data=<encrypted-id>` carries the sales-incharge to allocate beats for. */
export const Route = createFileRoute(
  '/_authenticated/sales-incharge/beat-allocation',
)({
  validateSearch: (search: Record<string, unknown>): { data?: string } => ({
    data: typeof search.data === 'string' ? search.data : undefined,
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <BeatAllocationPage data={data} />
}
