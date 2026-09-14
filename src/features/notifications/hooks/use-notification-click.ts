import { useNavigate } from '@tanstack/react-router'
import { toasterrormsg } from '@/lib/toast'
import { useCan } from '@/features/permissions'
import { useMarkNotificationRead } from '../api/use-inbox'
import { notificationRoute, notificationTarget } from '../lib/notification-route'
import type { InboxNotification } from '../types'

/**
 * What clicking a notification does.
 *
 * In this order, and the order is the point:
 *  1. mark it read — fired, NOT awaited, and optimistic, so the badge drops the
 *     moment the row is clicked rather than after the navigation;
 *  2. navigate to the request itself, not to the queue it lives in.
 *
 * A notification that opens nothing (a broadcast, or an entity type added on the
 * backend after this build shipped) is still marked read — it was read — and
 * simply does not navigate.
 *
 * Returns whether it navigated, so the caller can close its panel on the way
 * out and LEAVE IT OPEN otherwise: a click that went nowhere — a broadcast, or
 * one refused for permission — should not also cost the reader their place in
 * the feed.
 *
 * Permission is checked here rather than left to the route guard because the
 * recipients of a request notification are every Sales Admin of the company, not
 * only those who can act on it. An admin without the `:list` grant gets told
 * why, and the notification stays readable in the bell.
 */
export function useNotificationClick() {
  const navigate = useNavigate()
  const markRead = useMarkNotificationRead()
  const { can, isLoading: permissionsLoading } = useCan()

  return (notification: InboxNotification): boolean => {
    if (!notification.isRead) markRead.mutate(notification.id)

    const route = notificationRoute(notification.entityType)
    const target = notificationTarget(notification.entityType, notification.entityId)
    if (!route || !target) return false

    // Still resolving the grant list — treating "not loaded" as "not allowed"
    // would tell the admin he lacks a permission he may well hold.
    if (!permissionsLoading && !can(route.permission)) {
      toasterrormsg(`You don't have permission to open this ${route.label}.`)
      return false
    }

    // `href` rather than `to`: the destination comes out of a lookup table and
    // carries an encrypted `?data=` token, so it is a built URL string and not
    // one of the router's literal route ids. Same-origin, so this is still an
    // ordinary client-side navigation. No `n` in the token — the click above
    // already marked it read.
    void navigate({ href: target })
    return true
  }
}
