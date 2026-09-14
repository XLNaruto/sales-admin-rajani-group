import { z } from 'zod'

/**
 * The inbox wire shapes.
 *
 * Everything the panel does not control is parsed leniently on purpose: an
 * unknown `type`/`priority` falls back rather than blanking the bell, and
 * `entity_type` stays a plain string so a request kind added on the backend
 * reaches the UI as a non-clickable row instead of a parse failure.
 */

const TONES = ['info', 'success', 'warning', 'alert'] as const
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

/** An unrecognised tone reads as plain information, not as an alert. */
const toneSchema = z
  .string()
  .nullish()
  .transform((v) =>
    (TONES as readonly string[]).includes(v ?? '')
      ? (v as (typeof TONES)[number])
      : ('info' as const),
  )

/** An unrecognised priority reads as ordinary weight. */
const prioritySchema = z
  .string()
  .nullish()
  .transform((v) =>
    (PRIORITIES as readonly string[]).includes(v ?? '')
      ? (v as (typeof PRIORITIES)[number])
      : ('normal' as const),
  )

/**
 * One inbox row as the API sends it — the same shape in the list and in the
 * mark-read response. Mapped to camelCase here, so nothing downstream deals in
 * snake_case.
 */
export const inboxNotificationSchema = z
  .object({
    id: z.number(),
    broadcast_id: z.number().nullish(),
    title: z.string(),
    body: z.string(),
    type: toneSchema,
    priority: prioritySchema,
    event: z.string().nullish(),
    entity_type: z.string().nullish(),
    entity_id: z.number().nullish(),
    // Kept as the raw object: it is display context whose keys vary by event,
    // and pinning it to a closed shape would drop the ones added next.
    metadata: z.record(z.string(), z.unknown()).nullish(),
    is_read: z.boolean(),
    read_at: z.string().nullish(),
    created_at: z.string(),
  })
  .transform((n) => ({
    id: n.id,
    broadcastId: n.broadcast_id ?? null,
    title: n.title,
    body: n.body,
    type: n.type,
    priority: n.priority,
    event: n.event ?? null,
    entityType: n.entity_type ?? null,
    entityId: n.entity_id ?? null,
    metadata: n.metadata ?? null,
    isRead: n.is_read,
    readAt: n.read_at ?? null,
    createdAt: n.created_at,
  }))

/** The inbox list envelope (rows + pagination metadata). */
export const inboxResponseSchema = z.object({
  notifications: z.array(inboxNotificationSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

/** GET /notifications/inbox/unread-count. */
export const unreadCountResponseSchema = z
  .object({ unread: z.number() })
  .transform((r) => r.unread)

/** PATCH /notifications/inbox/read-all → how many rows flipped. */
export const readAllResponseSchema = z
  .object({ updated: z.number() })
  .transform((r) => r.updated)
