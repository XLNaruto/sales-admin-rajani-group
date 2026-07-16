import { createFileRoute } from '@tanstack/react-router'
import { SalesInchargeCreatePage } from '@/features/sales-incharge'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/sales-incharge/create')({
  validateSearch: (search: Record<string, unknown>): { data?: string } => ({
    data: typeof search.data === 'string' ? search.data : undefined,
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <SalesInchargeCreatePage data={data} />
}
