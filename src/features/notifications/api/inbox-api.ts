import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import {
  inboxNotificationSchema,
  inboxResponseSchema,
  readAllResponseSchema,
  unreadCountResponseSchema,
} from '../schemas'
import type { InboxNotification, InboxParams, InboxResult } from '../types'

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: InboxParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  // Only the Unread tab sends it — `unread=false` is a filter of its own
  // ("read only"), which is not a tab the bell offers.
  if (params.unread) q.unread = 'true'
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/**
 * GET /sales-incharge-admin/notifications/inbox — one page of the feed.
 *
 * Per-USER and ungated: no permission gates it, and no company scopes it. A row
 * here may well point at a request the admin must switch company to open.
 */
export async function fetchInbox(params: InboxParams = {}): Promise<InboxResult> {
  try {
    const raw = await http.get<unknown>(endpoints.NOTIFICATION.INBOX, {
      params: toQuery(params),
    })
    const res = inboxResponseSchema.parse(raw)
    return {
      items: res.notifications,
      total: res.total ?? res.notifications.length,
      page: res.page ?? params.page ?? 1,
      pageSize: res.page_size ?? params.pageSize ?? res.notifications.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, "Couldn't load your notifications.")
  }
}

/**
 * GET /sales-incharge-admin/notifications/inbox/unread-count — the badge.
 *
 * Cheap by design: this is the endpoint that gets polled, and the list is only
 * refetched when the dropdown opens or this number moves.
 */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const raw = await http.get<unknown>(endpoints.NOTIFICATION.UNREAD_COUNT)
    return unreadCountResponseSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, "Couldn't load your unread count.")
  }
}

/**
 * PATCH /sales-incharge-admin/notifications/inbox/{id}/read → the updated row.
 *
 * Idempotent: an already-read notification stays read and still answers 200.
 * Someone else's answers `404`, never `403`.
 */
export async function markNotificationRead(id: number): Promise<InboxNotification> {
  try {
    const raw = await http.patch<unknown>(endpoints.NOTIFICATION.READ(id))
    return inboxNotificationSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, "Couldn't mark the notification read.")
  }
}

/** PATCH /sales-incharge-admin/notifications/inbox/read-all → rows flipped. */
export async function markAllNotificationsRead(): Promise<number> {
  try {
    const raw = await http.patch<unknown>(endpoints.NOTIFICATION.READ_ALL)
    return readAllResponseSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, "Couldn't mark your notifications read.")
  }
}
