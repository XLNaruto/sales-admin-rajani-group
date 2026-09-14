import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Info,
  Megaphone,
  Route,
  UserRoundPen,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { notificationTarget } from '../lib/notification-route'
import type { InboxNotification, NotificationTone } from '../types'

/** "3m ago" / "2h ago". Falls back to the raw stamp if it won't parse. */
function agoLabel(iso: string): string {
  try {
    return `${formatDistanceToNowStrict(parseISO(iso))} ago`
  } catch {
    return iso
  }
}

/** What the row is about, by entity — a broadcast has no entity at all. */
const ENTITY_ICON: Record<string, LucideIcon> = {
  beat_change: Route,
  day_change: CalendarClock,
  profile_edit_request: UserRoundPen,
}

const TONE_ICON: Record<NotificationTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  alert: AlertTriangle,
}

/**
 * Tone colours the icon, nothing else. `priority` is `high` on all three
 * request events today, so painting the row by it would paint every row.
 */
const TONE_CLASS: Record<NotificationTone, string> = {
  info: 'bg-blue-600/10 text-blue-600 dark:text-blue-400',
  success: 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  alert: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

interface Props {
  notification: InboxNotification
  onSelect: (notification: InboxNotification) => void
}

/**
 * One row of the bell.
 *
 * `title` and `body` are already composed, human-readable English on the
 * backend — they are rendered as sent rather than reassembled from `metadata`,
 * so a copy change there arrives here for free.
 *
 * A row that opens nothing — a Super Admin broadcast, or a request type added
 * after this build shipped — still renders and can still be marked read; it
 * just isn't a link. Rendering it as one and dead-ending the click would be the
 * worse of the two failures.
 */
export function NotificationItem({ notification, onSelect }: Props) {
  const openable =
    notificationTarget(notification.entityType, notification.entityId) !== null
  const Icon = notification.entityType
    ? (ENTITY_ICON[notification.entityType] ?? TONE_ICON[notification.type])
    : notification.broadcastId != null
      ? Megaphone
      : TONE_ICON[notification.type]

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        // Side padding matches the sheet's header, so the icons line up with the
        // panel title rather than floating in from the edge.
        'flex w-full cursor-pointer items-start gap-3 border-b border-border/60 px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-accent/60',
        !notification.isRead && 'bg-primary/[0.04]',
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full',
          TONE_CLASS[notification.type],
        )}
      >
        <Icon className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 text-sm leading-snug',
              notification.isRead
                ? 'font-medium text-foreground/80'
                : 'font-semibold text-foreground',
            )}
          >
            {notification.title}
          </span>
          {/* The unread marker sits where the eye already is, beside the title,
              rather than as a second badge competing with the bell's own. */}
          {!notification.isRead ? (
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          ) : null}
        </span>

        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {notification.body}
        </span>

        <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground/80">
          <span className="tabular-nums">{agoLabel(notification.createdAt)}</span>
          {openable ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-primary">
              Open <ChevronRight className="size-3" />
            </span>
          ) : null}
        </span>
      </span>
    </button>
  )
}
