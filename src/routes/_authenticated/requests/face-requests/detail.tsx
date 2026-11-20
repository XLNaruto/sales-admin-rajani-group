import { createFileRoute } from '@tanstack/react-router'
import { FaceRequestDetailPage } from '@/features/field-requests'
import { decryptParams } from '@/lib/crypto'
import { validateDataSearch } from '@/lib/route-search'
import { requirePermission } from '@/features/permissions'

/**
 * The deep-link target behind a `sales_incharge_face_request` notification.
 *
 * Params ride in one encrypted `?data=` token — `{ id }`, plus `n` when a
 * browser push brought the admin straight here (the notification to mark read
 * on arrival). Gated by the SAME `sales-incharge-face-request:list` grant as the queue.
 */
export const Route = createFileRoute('/_authenticated/requests/face-requests/detail')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, 'sales-incharge-face-request:list'),
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
  return <FaceRequestDetailPage id={Number(params.id)} notificationId={params.n} />
}
