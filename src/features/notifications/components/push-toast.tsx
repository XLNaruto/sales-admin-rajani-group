import { toast } from 'sonner'
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Info,
  Megaphone,
  Route,
  UserRoundPen,
  X,
  type LucideIcon,
} from 'lucide-react'
import { asset } from '@/lib/asset'
import { cn } from '@/lib/utils'
import type { NotificationTone } from '../types'

/**
 * The card a FOREGROUND push renders as.
 *
 * Rendered through `toast.custom`, not the default sonner shape, because a push
 * carries more than a line of text: it is the same object the bell shows, so it
 * gets the same visual language — entity icon in a tone-coloured badge, title,
 * body, and an explicit "Open" affordance. The brand mark rides along in the
 * corner so an OS-level notification and an in-app one read as the same system.
 *
 * Kept beside {@link NotificationItem} on purpose: the two must stay visually
 * matched, and a change to one is a prompt to look at the other.
 */

/** What the push is about, by entity — a broadcast has no entity at all. */
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

/** Tone colours the badge and the left rail, nothing else. */
const TONE_BADGE: Record<NotificationTone, string> = {
  info: 'bg-blue-600/10 text-blue-600 ring-blue-600/20 dark:text-blue-400',
  success: 'bg-emerald-600/10 text-emerald-600 ring-emerald-600/20 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
  alert: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
}

const TONE_RAIL: Record<NotificationTone, string> = {
  info: 'bg-blue-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-500',
  alert: 'bg-rose-500',
}

export interface PushToastProps {
  title: string
  body?: string
  /** Visual weight; defaults to `info` when the payload doesn't say. */
  tone?: NotificationTone
  entityType?: string | null
  /** Present only when the push deep-links somewhere. */
  onOpen?: () => void
  onDismiss: () => void
}

export function PushToast({
  title,
  body,
  tone = 'info',
  entityType,
  onOpen,
  onDismiss,
}: PushToastProps) {
  // No entity at all is, by definition, a Super Admin broadcast; an entity we
  // don't have an icon for falls back to the tone's.
  const Icon = entityType ? (ENTITY_ICON[entityType] ?? TONE_ICON[tone]) : Megaphone

  return (
    <div
      className={cn(
        // `pointer-events-auto` re-enables clicks: the sonner container itself
        // is click-through so it never blocks the page beneath it. The pop-in
        // animation lives on sonner's wrapper, not here — running it twice
        // double-scales the card.
        'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl',
        // Fully opaque, not the /95 the plain toasts use: this card carries two
        // lines of copy and a button, and page content showing through it made
        // both hard to read.
        'border border-black/5 bg-white py-3 pr-3 pl-4',
        'shadow-[0_10px_30px_-8px_rgba(15,23,42,0.28),0_2px_8px_-4px_rgba(15,23,42,0.16)]',
        'dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)]',
      )}
    >
      {/* Tone rail — the one place the card admits what kind of news this is
          without spending a second badge on it. */}
      <span className={cn('absolute inset-y-0 left-0 w-1', TONE_RAIL[tone])} />

      <span
        className={cn(
          'icon-pop mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-inset',
          TONE_BADGE[tone],
        )}
      >
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 font-sans text-sm leading-tight font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </p>
          {/* The mark, small and quiet — identity, not decoration. */}
          <img
            src={asset('media/logos/logo-only.png')}
            alt=""
            aria-hidden
            className="mt-px size-5 shrink-0 rounded object-contain opacity-80"
          />
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="mt-px shrink-0 cursor-pointer rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {body ? (
          <p className="mt-0.5 font-sans text-xs leading-snug text-slate-500 dark:text-slate-400">
            {body}
          </p>
        ) : null}

        <div className="mt-2 flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            <Bell className="size-3" /> Just now
          </span>
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className="ml-auto inline-flex cursor-pointer items-center gap-0.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-slate-900"
            >
              Open <ChevronRight className="size-3" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Show a foreground push as a toast. Returns the sonner id.
 *
 * `toast.custom` rather than `toast()`: the default shape has one icon slot and
 * one action slot, and this card needs the brand mark, a dismiss control and a
 * deep link at once.
 */
export function showPushToast(
  props: Omit<PushToastProps, 'onDismiss'> & { onOpen?: () => void },
) {
  return toast.custom(
    (id) => (
      <PushToast
        {...props}
        onOpen={
          props.onOpen
            ? () => {
                toast.dismiss(id)
                props.onOpen?.()
              }
            : undefined
        }
        onDismiss={() => toast.dismiss(id)}
      />
    ),
    {
      // Long enough to read a two-line request summary and act on it, which the
      // default 4s is not.
      duration: 8000,
      // Sonner still wraps a custom toast in its own card — see the global
      // `toastOptions.classNames.toast` in `components/ui/sonner.tsx`. Left
      // alone that paints a second card behind this one, so the wrapper is
      // stripped back to a bare, full-width box. `!` because sonner concatenates
      // these AFTER the global classes without tailwind-merge, so they'd
      // otherwise only tie on specificity.
      classNames: {
        toast:
          'w-full! border-0! bg-transparent! p-0! shadow-none! backdrop-blur-none! cursor-default! dark:bg-transparent! dark:border-0! dark:shadow-none!',
      },
    },
  )
}
