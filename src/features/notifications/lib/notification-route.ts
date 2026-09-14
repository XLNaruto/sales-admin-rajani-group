import { encryptParams } from '@/lib/crypto'
import type { Permission } from '@/features/permissions'
import type { NotificationEntityType } from '../types'

/**
 * THE routing table for notification deep links.
 *
 * The API deliberately hands us a typed `(entity_type, entity_id)` pair rather
 * than a URL — the panel owns where those live. This is the one place that
 * mapping exists, and both the dropdown and the push handler go through it.
 *
 * Ids never appear in the path: like every other detail screen in the app, a
 * request opens on a fixed route carrying its params in one encrypted `?data=`
 * token (see `lib/route-search.ts`). That keeps the address bar and the
 * breadcrumb free of raw database ids.
 *
 * `entity_type` is a closed set of three today, and will not stay that way —
 * orders, dispatch and collections are coming. An unknown value must therefore
 * render as a non-clickable row rather than crash, which is what a `null` from
 * {@link notificationTarget} means.
 */
interface NotificationRoute {
  /** The screen the request opens on — no id segment; see {@link notificationTarget}. */
  base: string
  /**
   * The grant that opens it — the SAME `:list` key as the queue the request
   * sits in, because reading one row is the authority to read the list.
   *
   * Recipients are every Sales Admin of the rep's company, not only those who
   * can act, so an admin can legitimately hold a notification he cannot open.
   */
  permission: Permission
  /** What to call the thing in a message to the user. */
  label: string
}

export const NOTIFICATION_ROUTE: Record<string, NotificationRoute> = {
  beat_change: {
    base: '/requests/beat-changes/detail',
    permission: 'beat-change:list',
    label: 'beat change request',
  },
  day_change: {
    base: '/requests/day-changes/detail',
    permission: 'day-change:list',
    label: 'day change request',
  },
  profile_edit_request: {
    base: '/requests/profile-edits/detail',
    permission: 'profile-edit-request:list',
    label: 'profile edit request',
  },
}

/** The routing entry for an entity type, or `null` if this panel predates it. */
export function notificationRoute(
  entityType: NotificationEntityType | null | undefined,
): NotificationRoute | null {
  if (!entityType) return null
  return NOTIFICATION_ROUTE[entityType] ?? null
}

/**
 * The URL a notification opens, or `null` when it opens nothing — a broadcast
 * (no entity at all) or an entity type this build does not know about.
 *
 * `notificationId` is for arrivals from OUTSIDE the app (a browser push clicked
 * from the OS): it rides in the same token as `n`, and the screen it lands on
 * marks that notification read. An in-app click marks it read itself and should
 * leave this out.
 */
export function notificationTarget(
  entityType: NotificationEntityType | null | undefined,
  entityId: number | null | undefined,
  notificationId?: number | null,
): string | null {
  const route = notificationRoute(entityType)
  if (!route || entityId == null) return null
  const token = encryptParams({
    id: entityId,
    ...(notificationId != null ? { n: notificationId } : {}),
  })
  return `${route.base}?data=${token}`
}
