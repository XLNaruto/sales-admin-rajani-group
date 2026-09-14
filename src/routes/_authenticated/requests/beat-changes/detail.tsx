import { createFileRoute } from '@tanstack/react-router'
import { BeatChangeDetailPage } from '@/features/field-requests'
import { decryptParams } from '@/lib/crypto'
import { validateDataSearch } from '@/lib/route-search'
import { requirePermission } from '@/features/permissions'

/**
 * The deep-link target behind a `beat_change` notification.
 *
 * Params ride in one encrypted `?data=` token — `{ id }`, plus `n` when a
 * browser push brought the admin straight here, which names the notification to
 * mark read on arrival. Keeping the id out of the path is the app-wide rule for
 * detail screens (see `lib/route-search.ts`); it also keeps the breadcrumb
 * reading "Beat Change Request" instead of a bare row number.
 *
 * Gated by the SAME `beat-change:list` grant as the queue: reading one request is the same
 * authority as reading the list it sits in. Notifications go to every sales
 * admin of the rep's company, not only those who can act on them, so a visit
 * without the grant is expected — it lands on the Forbidden screen, and the
 * dropdown says why before it ever navigates.
 */
export const Route = createFileRoute('/_authenticated/requests/beat-changes/detail')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'beat-change:list'),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

/** What the `?data=` token carries. */
interface DetailParams {
  id?: number
  /** The notification that led here, when one did. */
  n?: number
}

function RouteComponent() {
  const { data } = Route.useSearch()
  const params = (data ? decryptParams<DetailParams>(data) : null) ?? {}
  // A missing or tampered token leaves `id` undefined; the page renders its own
  // not-found state rather than the route throwing.
  return <BeatChangeDetailPage id={Number(params.id)} notificationId={params.n} />
}
