/**
 * The bell's feed — the signed-in admin's notification inbox.
 *
 * Two kinds of row arrive on the same endpoint. A BROADCAST is something a
 * Super Admin composed and blasted at a group: it carries a `broadcastId` and
 * none of the deep-link fields. A SYSTEM notification is one of ours: no
 * broadcast id, and `event` / `entityType` / `entityId` / `metadata` populated.
 * Only the second kind is clickable through to a screen.
 */

/** Visual weight of a row. Not a priority — see {@link NotificationPriority}. */
export type NotificationTone = 'info' | 'success' | 'warning' | 'alert'

/**
 * How loud the row should be. Every request event is `high` today, so this is
 * for colour and a dot only — sorting by it would produce one flat list.
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

/** The request types the panel knows how to open. */
export const NOTIFICATION_ENTITY_TYPES = [
  'beat_change',
  'day_change',
  'profile_edit_request',
] as const

export type KnownNotificationEntity = (typeof NOTIFICATION_ENTITY_TYPES)[number]

/**
 * What a notification points at.
 *
 * A closed set of three today, but the backend will add more (orders, dispatch,
 * collections) and an old panel has to survive meeting one — hence the open
 * `string` arm rather than a bare union. Anything outside the three renders as
 * a non-clickable row instead of crashing.
 */
export type NotificationEntityType = KnownNotificationEntity | (string & {})

/**
 * Display context the backend composed alongside `title`/`body`, so a row
 * renders without a second call.
 *
 * DISPLAY ONLY. Never branch authorization or business logic on it — read the
 * entity itself before acting on it. Every key is optional and the backend may
 * add more, so it is typed loosely on purpose.
 */
export interface NotificationMetadata {
  /** The rep who raised the request. */
  requested_by_name?: string
  /**
   * Which company the request belongs to. The inbox is per-user while the
   * request reads are per-company, so this is what turns a bare 404 on the deep
   * link into "switch company to open it".
   */
  company_ids?: number[]
  detail?: string
  sales_incharge_id?: number
  plan_date?: string
  operation?: string
  /** A COUNT of proposed entries on a day change — not the entries themselves. */
  entries?: number
  reason?: string
  message?: string
  [key: string]: unknown
}

/** One row of the inbox. */
export interface InboxNotification {
  id: number
  /** Set only on a Super Admin broadcast; null on everything the system raised. */
  broadcastId: number | null
  /** Composed, human-readable English — prefer it over reassembling `metadata`. */
  title: string
  body: string
  type: NotificationTone
  priority: NotificationPriority
  /** e.g. `beat_change.requested`. Null on a broadcast. */
  event: string | null
  /** The deep link, as a typed pair. Both null on a broadcast. */
  entityType: NotificationEntityType | null
  entityId: number | null
  metadata: NotificationMetadata | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

/** Query params accepted by the inbox list endpoint (camelCase). */
export interface InboxParams {
  page?: number
  /** 1–100; the endpoint defaults to 20. */
  pageSize?: number
  /** `true` is the Unread tab. Omitted means both. */
  unread?: boolean
  /** By `created_at`. Leave at `desc` — the feed is newest-first. */
  sortOrder?: 'asc' | 'desc'
}

/** Normalised inbox result: a page of rows + pagination. */
export interface InboxResult {
  items: InboxNotification[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
