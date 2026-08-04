import { X } from 'lucide-react'

/**
 * What the last save did, in one line.
 *
 * The stat rail and the warnings both move when the beat list changes, and a save
 * can silently drop a pin the server refuses to move (a locked date, or one the
 * rep has taken over). This is where that gets said, so a row that didn't change
 * never looks like a glitch.
 */
export function PlanNotice({
  message,
  onDismiss,
}: {
  message: string
  /** Omitted for a standing notice — a plan's own state isn't dismissible. */
  onDismiss?: () => void
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-info/25 bg-info/10 px-4 py-3 text-sm text-foreground"
    >
      <p className="min-w-0 flex-1">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 grid size-5 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
