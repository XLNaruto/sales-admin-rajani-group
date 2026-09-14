import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { InboxResult, NotificationEntityType } from '../types'

/**
 * Which companies a request belongs to, according to the notification that
 * pointed at it.
 *
 * The single most likely support ticket here: the inbox is per-USER while the
 * request reads are scoped to the selected company, so `GET /beat-changes/41`
 * can 404 purely because the admin is currently acting as a different tenant.
 * `metadata.company_ids` is what separates that from a request that genuinely
 * is not there — and it arrives on the notification, not on the request.
 *
 * Read from the cache rather than plumbed through the URL on purpose: the click
 * that opened the screen came from the dropdown, which is exactly what put the
 * notification in the cache. Returns an empty array when it isn't there (a cold
 * reload, or a link arrived at from a push), and the caller then falls back to
 * a plain not-found — a wrong guess about the tenant would be worse than none.
 */
export function useNotificationCompanyHint(
  entityType: NotificationEntityType,
  entityId: number,
): number[] {
  const qc = useQueryClient()

  const cached = qc.getQueriesData<InfiniteData<InboxResult, number>>({
    queryKey: queryKeys.notifications.inbox.all,
    exact: false,
  })

  for (const [, data] of cached) {
    for (const page of data?.pages ?? []) {
      for (const notification of page.items) {
        if (notification.entityType !== entityType) continue
        if (notification.entityId !== entityId) continue
        const ids = notification.metadata?.company_ids
        if (Array.isArray(ids)) return ids.filter((id): id is number => typeof id === 'number')
      }
    }
  }

  return []
}
